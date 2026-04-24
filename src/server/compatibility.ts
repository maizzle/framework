import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import postcss, { type Declaration, type AtRule, type Rule } from 'postcss'
import safeParser from 'postcss-safe-parser'
import valueParser from 'postcss-value-parser'
import { Parser } from 'htmlparser2'
import { DomHandler, type ChildNode, type Element } from 'domhandler'
import { parseSfcBlocks, findComponentTags, buildComponentMap, type SfcBlock } from './sfc-utils.ts'
import { scanLint } from './linter.ts'
import { tailwindcss as compileWithPipeline } from '../transformers/tailwindcss.ts'
import type { MaizzleConfig } from '../types/index.ts'

const API_URL = 'https://www.caniemail.com/api/data.json'
const DEFAULT_CLIENTS = new Set(['gmail', 'apple-mail', 'outlook', 'yahoo'])

type SupportLevel = 'unsupported' | 'mitigated' | 'unknown'

interface Feature {
  slug: string
  title: string
  url: string
  category: string
  stats: any
}

interface Issue {
  kind: 'compat' | 'lint'
  slug?: string
  title: string
  url?: string
  category: string
  line?: number
  file: string
  // compat-only
  supportLevel?: SupportLevel
  supportLabel?: string
  affectedClients?: string[]
  // lint-only
  severity?: 'error' | 'warning'
  message?: string
}

interface Indexes {
  nicenames: { supported: string, mitigated: string, unsupported: string, unknown: string, mixed: string }
  familyNicenames: Record<string, string>
  cssProp: Map<string, Feature[]>
  cssPropValue: Map<string, Array<{ value: string, feature: Feature }>>
  cssAtRule: Map<string, Feature[]>
  cssMediaFeature: Map<string, Feature[]>
  cssPseudoClass: Map<string, Feature[]>
  cssPseudoElement: Map<string, Feature[]>
  cssFunction: Map<string, Feature[]>
  cssUnit: Map<string, Feature[]>
  cssImportant?: Feature
  cssVariables?: Feature
  cssNesting?: Feature
  cssComments?: Feature
  cssModernColor?: Feature
  htmlTag: Map<string, Feature[]>
  htmlAttr: Map<string, Feature[]>
  htmlInputType: Map<string, Feature[]>
  htmlButtonType: Map<string, Feature[]>
  htmlDoctype?: Feature
  htmlComments?: Feature
  htmlAnchorLinks?: Feature
  htmlMailtoLinks?: Feature
  htmlMetaColorScheme?: Feature
  htmlSemantics?: Feature
  htmlStyleInBody?: Feature
  imageExt: Map<string, Feature[]>
  /** All features by slug — unfiltered, used for URL lookups (e.g. by lint). */
  bySlug: Map<string, { title: string, url: string }>
}

let indexes: Indexes | null = null
let initPromise: Promise<Indexes | null> | null = null

function mpush<K, V>(m: Map<K, V[]>, k: K, v: V) {
  const arr = m.get(k)
  if (arr) arr.push(v)
  else m.set(k, [v])
}

function emptyIndexes(nicenames: any, familyNicenames: Record<string, string>): Indexes {
  return {
    nicenames,
    familyNicenames,
    cssProp: new Map(), cssPropValue: new Map(), cssAtRule: new Map(),
    cssMediaFeature: new Map(), cssPseudoClass: new Map(), cssPseudoElement: new Map(),
    cssFunction: new Map(), cssUnit: new Map(),
    htmlTag: new Map(), htmlAttr: new Map(), htmlInputType: new Map(), htmlButtonType: new Map(),
    imageExt: new Map(),
    bySlug: new Map(),
  }
}

function hasAnyNonY(stats: any): boolean {
  if (!stats) return false
  for (const family in stats) {
    for (const plat in stats[family]) {
      for (const ver in stats[family][plat]) {
        const v = stripNotes(String(stats[family][plat][ver]).trim())
        if (v && v !== 'y') return true
      }
    }
  }
  return false
}

/** Strip `#N` note markers — `"y #1"` → `"y"`. Notes document edge cases but
 *  don't change support semantics, so treat `y #1` as fully supported. */
function stripNotes(v: string): string {
  return v.split(/\s+/).filter(t => t && !t.startsWith('#')).join(' ')
}

function computeSupport(stats: any, familyNicenames: Record<string, string>, allowedClients: Set<string> | 'all'): { level: SupportLevel, affected: string[] } | null {
  let nY = 0, nN = 0, nU = 0, nPartial = 0, total = 0
  const affectedFamilies = new Set<string>()
  for (const family in stats) {
    if (allowedClients !== 'all' && !allowedClients.has(family)) continue
    let familyHasNonY = false
    for (const plat in stats[family]) {
      // Only score the latest version per (family, platform) — legacy
      // versions (Outlook 2007, etc.) otherwise flag modern-widely-supported
      // features as partial forever.
      const versions = Object.keys(stats[family][plat]).sort()
      const latest = versions[versions.length - 1]
      if (!latest) continue
      total++
      const v = stripNotes(String(stats[family][plat][latest]).trim())
      if (v === 'y') nY++
      else if (v === 'n') { nN++; familyHasNonY = true }
      else if (v === 'u') { nU++; familyHasNonY = true }
      else { nPartial++; familyHasNonY = true }
    }
    if (familyHasNonY) affectedFamilies.add(family)
  }
  if (!total) return null
  if (nY === total) return null
  const affected = [...affectedFamilies].map(f => familyNicenames[f] ?? f).sort()
  if (nN === total) return { level: 'unsupported', affected }
  if (nU === total) return { level: 'unknown', affected }
  return { level: 'mitigated', affected }
}

/**
 * Slugs we never report. Fundamental HTML (every email uses these) plus
 * CSS noise that's not actionable (comments, !important usage).
 */
const IGNORED_SLUGS = new Set([
  // Required/unavoidable tags
  'html-doctype', 'html-comments',
  'html-html', 'html-head', 'html-body', 'html-title',
  'html-meta', 'html-meta-color-scheme',
  'html-style', 'html-link',
  'html-div', 'html-span', 'html-br', 'html-p', 'html-a', 'html-img',
  'html-table', 'html-tr', 'html-td', 'html-th',
  'html-thead', 'html-tbody', 'html-tfoot',
  'html-h1-h6', 'html-lists',
  'html-strong', 'html-em', 'html-b', 'html-i', 'html-u',
  'html-semantics',
  // Ubiquitous attributes — always present, caveats aren't actionable.
  'html-role', 'html-hidden', 'html-width', 'html-height',
  // CSS noise
  'css-comments', 'css-important',
  // CSS fundamentals — universally used with known minor caveats; flagging
  // them as "partial" is noise rather than signal.
  'css-margin', 'css-padding', 'css-border',
  'css-font-size', 'css-font-weight', 'css-font', 'css-font-family',
  'css-line-height', 'css-letter-spacing', 'css-text-align',
  'css-text-decoration', 'css-text-transform', 'css-color',
  'css-background', 'css-background-color',
  'css-width', 'css-height',
  'css-display',
])

function classify(f: Feature, idx: Indexes) {
  const slug = f.slug
  // Retain html-style feature for the body-only detector even though it's
  // blacklisted from the normal html-tag detection path. Title is suffixed
  // so the flag reads as a body-placement warning, not a blanket `<style>`.
  if (slug === 'html-style') {
    idx.htmlStyleInBody = { ...f, title: `${f.title} in <body>` }
    return
  }
  if (IGNORED_SLUGS.has(slug)) return

  if (f.category === 'css') return classifyCss(f, slug, idx)
  if (f.category === 'html') return classifyHtml(f, slug, idx)
  if (f.category === 'image') {
    const ext = slug.slice('image-'.length)
    if (ext === 'base64') return
    mpush(idx.imageExt, ext, f)
  }
  // 'others' (amp, bimi) intentionally skipped
}

function classifyCss(f: Feature, slug: string, idx: Indexes) {
  // Specials first
  switch (slug) {
    case 'css-important': idx.cssImportant = f; return
    case 'css-variables': idx.cssVariables = f; return
    case 'css-nesting': idx.cssNesting = f; return
    case 'css-comments': idx.cssComments = f; return
    case 'css-modern-color': idx.cssModernColor = f; return
    case 'css-display-flex': mpushPropValue(idx, 'display', 'flex', f); return
    case 'css-display-grid': mpushPropValue(idx, 'display', 'grid', f); return
    case 'css-display-none': mpushPropValue(idx, 'display', 'none', f); return
    case 'css-rgb': mpush(idx.cssFunction, 'rgb', f); return
    case 'css-rgba': mpush(idx.cssFunction, 'rgba', f); return
    case 'css-linear-gradient': mpush(idx.cssFunction, 'linear-gradient', f); return
    case 'css-radial-gradient': mpush(idx.cssFunction, 'radial-gradient', f); return
    case 'css-conic-gradient': mpush(idx.cssFunction, 'conic-gradient', f); return
  }

  if (slug.startsWith('css-at-media-') && slug !== 'css-at-media') {
    mpush(idx.cssMediaFeature, slug.slice('css-at-media-'.length), f)
    return
  }
  if (slug.startsWith('css-at-')) {
    mpush(idx.cssAtRule, slug.slice('css-at-'.length), f)
    return
  }
  if (slug.startsWith('css-pseudo-class-')) {
    mpush(idx.cssPseudoClass, slug.slice('css-pseudo-class-'.length), f)
    return
  }
  if (slug.startsWith('css-pseudo-element-')) {
    mpush(idx.cssPseudoElement, slug.slice('css-pseudo-element-'.length), f)
    return
  }
  if (slug.startsWith('css-unit-')) {
    const u = slug.slice('css-unit-'.length)
    if (u === 'calc') { mpush(idx.cssFunction, 'calc', f); return }
    if (u === 'initial') return // keyword detection is noisy; skip
    const unit = u === 'percent' ? '%' : u
    mpush(idx.cssUnit, unit, f)
    return
  }
  if (slug.startsWith('css-function-')) {
    mpush(idx.cssFunction, slug.slice('css-function-'.length), f)
    return
  }
  // css-selector-* — skip (too broad to detect meaningfully)
  if (slug.startsWith('css-selector-')) return

  // Fallback: treat as property name
  mpush(idx.cssProp, slug.slice('css-'.length), f)
}

function mpushPropValue(idx: Indexes, prop: string, value: string, f: Feature) {
  const arr = idx.cssPropValue.get(prop)
  if (arr) arr.push({ value, feature: f })
  else idx.cssPropValue.set(prop, [{ value, feature: f }])
}

const HTML_ATTR_SLUGS = new Set([
  'align', 'background', 'cellpadding', 'cellspacing', 'height', 'width',
  'valign', 'target', 'srcset', 'lang', 'dir', 'role', 'required', 'hidden',
])

function classifyHtml(f: Feature, slug: string, idx: Indexes) {
  // Specials
  switch (slug) {
    case 'html-doctype': idx.htmlDoctype = f; return
    case 'html-comments': idx.htmlComments = f; return
    case 'html-anchor-links': idx.htmlAnchorLinks = f; return
    case 'html-mailto-links': idx.htmlMailtoLinks = f; return
    case 'html-meta-color-scheme': idx.htmlMetaColorScheme = f; return
    case 'html-semantics': idx.htmlSemantics = f; return
    case 'html-loading-attribute': mpush(idx.htmlAttr, 'loading', f); return
    case 'html-image-maps':
      mpush(idx.htmlTag, 'map', f); mpush(idx.htmlTag, 'area', f); mpush(idx.htmlAttr, 'usemap', f); return
    case 'html-lists':
      for (const t of ['ul', 'ol', 'li', 'dl', 'dt', 'dd']) mpush(idx.htmlTag, t, f)
      return
    case 'html-h1-h6':
      for (const t of ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']) mpush(idx.htmlTag, t, f)
      return
  }

  if (slug.startsWith('html-input-')) {
    mpush(idx.htmlInputType, slug.slice('html-input-'.length), f)
    return
  }
  if (slug.startsWith('html-button-')) {
    mpush(idx.htmlButtonType, slug.slice('html-button-'.length), f)
    return
  }
  if (slug.startsWith('html-aria-')) {
    mpush(idx.htmlAttr, slug.slice('html-'.length), f)
    return
  }
  const name = slug.slice('html-'.length)
  if (HTML_ATTR_SLUGS.has(name)) {
    mpush(idx.htmlAttr, name, f)
    return
  }
  mpush(idx.htmlTag, name, f)
}

export async function initCompatibility(): Promise<Indexes | null> {
  if (indexes) return indexes
  if (initPromise) return initPromise
  initPromise = (async () => {
    try {
      const res = await fetch(API_URL)
      if (!res.ok) return null
      const data = await res.json()
      const idx = emptyIndexes(data.nicenames?.support ?? {}, data.nicenames?.family ?? {})
      for (const item of data.data ?? []) {
        // Record every slug's title/url so lint can look up caniemail pages
        // for issues that map to a known feature, even ignored ones.
        if (item.slug && item.url) idx.bySlug.set(item.slug, { title: item.title, url: item.url })
        // Index the feature if any cell anywhere in the matrix is non-y.
        // Per-request aggregation (with the active client filter) decides
        // whether to actually surface the issue.
        if (!hasAnyNonY(item.stats)) continue
        const f: Feature = {
          slug: item.slug,
          title: item.title,
          url: item.url,
          category: item.category,
          stats: item.stats,
        }
        classify(f, idx)
      }
      indexes = idx
      return idx
    } catch {
      return null
    }
  })()
  return initPromise
}

// Note: fetch of the caniemail dataset is lazy — it fires on the first
// check request, not at module load, so `server.checks: false` pays no
// network cost.

interface FileStreams {
  path: string
  source: string
  template: SfcBlock | null
  styles: SfcBlock[]
  classes: Set<string>
}

function collectStreams(
  filePath: string,
  componentMap: Map<string, string>,
  visited: Set<string>,
  out: FileStreams[],
) {
  if (visited.has(filePath)) return
  visited.add(filePath)

  let source: string
  try {
    source = readFileSync(filePath, 'utf-8')
  } catch { return }

  const { template, styles } = parseSfcBlocks(source)
  const classes = new Set<string>()
  if (template) extractClasses(template.content, classes)

  out.push({ path: filePath, source, template, styles, classes })

  if (template) {
    for (const tag of findComponentTags(template.content)) {
      const cp = componentMap.get(tag.toLowerCase())
      if (cp) collectStreams(cp, componentMap, visited, out)
    }
  }
}

function extractClasses(html: string, out: Set<string>) {
  const parser = new Parser({
    onopentag(_tag, attrs) {
      const c = attrs.class
      if (!c) return
      for (const t of c.split(/\s+/)) if (t) out.add(t)
    },
  }, { decodeEntities: true })
  parser.write(html)
  parser.end()
}

function parseWithIndices(html: string): ChildNode[] {
  const handler = new DomHandler(undefined, { withStartIndices: true })
  const parser = new Parser(handler)
  parser.write(html)
  parser.end()
  return handler.dom
}

function findStyleNodes(nodes: ChildNode[], out: Element[] = []): Element[] {
  for (const n of nodes) {
    const el = n as Element
    if (el.name === 'style') out.push(el)
    if (el.children?.length) findStyleNodes(el.children as ChildNode[], out)
  }
  return out
}

/**
 * Parse each file's template, collect every `<style>` node with its source
 * line (via htmlparser2 start indices), then pass the combined DOM through
 * the framework's real Tailwind pipeline. The pipeline resolves imports
 * (@maizzle/tailwindcss), compiles utilities from class attrs, lowers modern
 * CSS via lightningcss, and resolves static calc() — so what we walk matches
 * what ships.
 */
async function compileViaPipeline(
  streams: FileStreams[],
  config: MaizzleConfig,
  rootFile: string,
): Promise<Array<{ file: string, css: string, line: number }>> {
  const all: ChildNode[] = []
  const tracked: Array<{ node: Element, file: string, line: number }> = []

  for (const s of streams) {
    if (!s.template) continue
    const templateStart = s.source.indexOf(s.template.content)
    const nodes = parseWithIndices(s.template.content)
    for (const styleNode of findStyleNodes(nodes)) {
      const startIdx = (styleNode as any).startIndex ?? 0
      const line = offsetToLine(s.source, templateStart + startIdx)
      tracked.push({ node: styleNode, file: s.path, line })
    }
    for (const n of nodes) all.push(n)
  }

  if (!tracked.length) return []

  try {
    await compileWithPipeline(all, config, rootFile)
  } catch { return [] }

  return tracked
    .map(t => {
      const txt = t.node.children?.find(c => (c as any).type === 'text') as any
      return txt?.data ? { file: t.file, css: txt.data as string, line: t.line } : null
    })
    .filter((x): x is { file: string, css: string, line: number } => x !== null)
}

/**
 * Walk CSS AST with detectors. Calls onHit per feature hit.
 * `selector` is the containing rule's selector (undefined if no rule ancestor).
 */
function walkCss(
  css: string,
  idx: Indexes,
  onHit: (feature: Feature, node: { line?: number, selector?: string }) => void,
) {
  let root: postcss.Root
  try { root = safeParser(css) } catch { return }

  const containingSelector = (n: postcss.Node | undefined): string | undefined => {
    let p = n?.parent
    while (p && p.type !== 'root') {
      if (p.type === 'rule') return (p as Rule).selector
      p = p.parent
    }
    return undefined
  }

  if (idx.cssComments) {
    root.walkComments((c) => { onHit(idx.cssComments!, { line: c.source?.start?.line, selector: containingSelector(c) }) })
  }

  root.walkAtRules((atRule: AtRule) => {
    const line = atRule.source?.start?.line
    let sel = containingSelector(atRule)
    if (atRule.name === 'media' && !sel) {
      const innerSelectors: string[] = []
      atRule.walkRules((r) => { innerSelectors.push(r.selector) })
      if (innerSelectors.length) sel = innerSelectors.join(', ')
    }

    if (atRule.name === 'media') {
      // Pick the most specific media-feature match (prefers-color-scheme,
      // hover, orientation, …). If one matches, skip the generic `css-at-media`
      // to avoid duplicate rows pointing at the same line.
      const specific: Feature[] = []
      if (idx.cssMediaFeature.size) {
        for (const [feat, fs2] of idx.cssMediaFeature) {
          if (atRule.params.includes(`(${feat}`) || atRule.params.includes(feat)) {
            specific.push(...fs2)
          }
        }
      }
      if (specific.length) {
        for (const f of specific) onHit(f, { line, selector: sel })
      } else {
        const fs = idx.cssAtRule.get('media')
        if (fs) for (const f of fs) onHit(f, { line, selector: sel })
      }
    } else {
      const fs = idx.cssAtRule.get(atRule.name)
      if (fs) for (const f of fs) onHit(f, { line, selector: sel })
    }
  })

  root.walkRules((rule: Rule) => {
    const line = rule.source?.start?.line
    const sel = rule.selector
    if (idx.cssPseudoClass.size) {
      for (const [name, fs] of idx.cssPseudoClass) {
        const re = new RegExp(`(^|[^:]):${escapeRe(name)}(\\b|\\()`)
        if (re.test(sel)) for (const f of fs) onHit(f, { line, selector: sel })
      }
    }
    if (idx.cssPseudoElement.size) {
      for (const [name, fs] of idx.cssPseudoElement) {
        const re = new RegExp(`::${escapeRe(name)}\\b`)
        if (re.test(sel)) for (const f of fs) onHit(f, { line, selector: sel })
      }
    }
  })

  root.walkDecls((decl: Declaration) => {
    const line = decl.source?.start?.line
    const sel = containingSelector(decl)
    const prop = decl.prop

    if (idx.cssImportant && decl.important) onHit(idx.cssImportant, { line, selector: sel })
    if (idx.cssVariables && prop.startsWith('--')) onHit(idx.cssVariables, { line, selector: sel })

    const fs = idx.cssProp.get(prop)
    if (fs) for (const f of fs) onHit(f, { line, selector: sel })

    const pvs = idx.cssPropValue.get(prop)
    if (pvs) {
      const v = decl.value.trim().toLowerCase()
      for (const pv of pvs) if (v === pv.value) onHit(pv.feature, { line, selector: sel })
    }

    if (idx.cssFunction.size || idx.cssUnit.size || idx.cssVariables || idx.cssModernColor) {
      try {
        valueParser(decl.value).walk((n) => {
          if (n.type === 'function') {
            const fname = n.value.toLowerCase()
            const fs2 = idx.cssFunction.get(fname)
            if (fs2) for (const f of fs2) onHit(f, { line, selector: sel })
            if (idx.cssVariables && fname === 'var') onHit(idx.cssVariables, { line, selector: sel })
            if (idx.cssModernColor && MODERN_COLOR_FNS.has(fname)) onHit(idx.cssModernColor, { line, selector: sel })
          } else if (n.type === 'word') {
            const m = /^-?\d*\.?\d+([a-z%]+)$/i.exec(n.value)
            if (m) {
              const unit = m[1].toLowerCase()
              const fs2 = idx.cssUnit.get(unit)
              if (fs2) for (const f of fs2) onHit(f, { line, selector: sel })
            }
          }
        })
      } catch {}
    }
  })
}

const MODERN_COLOR_FNS = new Set(['oklch', 'oklab', 'lch', 'lab', 'color', 'color-mix', 'hwb'])

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function offsetToLine(source: string, offset: number): number {
  let line = 1
  for (let i = 0; i < offset && i < source.length; i++) {
    if (source.charCodeAt(i) === 10) line++
  }
  return line
}

function walkTemplate(
  html: string,
  idx: Indexes,
  fileLineOffset: number,
  source: string,
  templateStartOffset: number,
  onHit: (feature: Feature, line: number) => void,
) {
  const semanticTags = new Set(['article', 'aside', 'details', 'figcaption', 'figure',
    'footer', 'header', 'main', 'mark', 'nav', 'section', 'time', 'summary'])

  // Stack of tags that opened a body-scope: a literal <body> or a
  // <Teleport to="body..."> whose rendered contents land inside body.
  const bodyScopeStack: string[] = []
  const parser = new Parser({
    onopentag(tag, attrs) {
      const startIdx = (parser as any).startIndex as number
      const line = offsetToLine(source, templateStartOffset + startIdx)

      const tagFs = idx.htmlTag.get(tag)
      if (tagFs) for (const f of tagFs) onHit(f, line)

      if (idx.htmlSemantics && semanticTags.has(tag)) onHit(idx.htmlSemantics, line)

      if (tag === 'style' && bodyScopeStack.length > 0 && idx.htmlStyleInBody) {
        onHit(idx.htmlStyleInBody, line)
      }
      if (tag === 'body') bodyScopeStack.push(tag)
      else if (tag === 'teleport' && /body/i.test(attrs.to ?? '')) bodyScopeStack.push(tag)

      for (const attr in attrs) {
        const attrFs = idx.htmlAttr.get(attr)
        if (attrFs) for (const f of attrFs) onHit(f, line)
      }

      if (tag === 'input' && attrs.type) {
        const fs = idx.htmlInputType.get(attrs.type.toLowerCase())
        if (fs) for (const f of fs) onHit(f, line)
      }
      if (tag === 'button' && attrs.type) {
        const fs = idx.htmlButtonType.get(attrs.type.toLowerCase())
        if (fs) for (const f of fs) onHit(f, line)
      }
      if (tag === 'a' && attrs.href) {
        const h = attrs.href.trim()
        if (idx.htmlMailtoLinks && /^mailto:/i.test(h)) onHit(idx.htmlMailtoLinks, line)
        else if (idx.htmlAnchorLinks && h.startsWith('#')) onHit(idx.htmlAnchorLinks, line)
      }
      if (tag === 'meta' && idx.htmlMetaColorScheme
          && attrs.name?.toLowerCase() === 'color-scheme') onHit(idx.htmlMetaColorScheme, line)

      // Image formats via src / srcset
      if (idx.imageExt.size && (attrs.src || attrs.srcset)) {
        const urls: string[] = []
        if (attrs.src) urls.push(attrs.src)
        if (attrs.srcset) for (const part of attrs.srcset.split(',')) urls.push(part.trim().split(/\s+/)[0])
        for (const url of urls) {
          const m = /\.([a-z0-9]+)(?:\?|#|$)/i.exec(url)
          if (!m) continue
          const fs = idx.imageExt.get(m[1].toLowerCase())
          if (fs) for (const f of fs) onHit(f, line)
        }
      }

      // inline style attribute → scan as CSS decl list
      if (attrs.style) scanInlineStyle(attrs.style, idx, line, onHit)
    },
    onclosetag(tag) {
      const top = bodyScopeStack[bodyScopeStack.length - 1]
      if (top === tag) bodyScopeStack.pop()
    },
    onprocessinginstruction(name) {
      if (idx.htmlDoctype && name.toLowerCase() === '!doctype') {
        const startIdx = (parser as any).startIndex as number
        onHit(idx.htmlDoctype, offsetToLine(source, templateStartOffset + startIdx))
      }
    },
    oncomment() {
      if (idx.htmlComments) {
        const startIdx = (parser as any).startIndex as number
        onHit(idx.htmlComments, offsetToLine(source, templateStartOffset + startIdx))
      }
    },
  }, { decodeEntities: false, lowerCaseTags: true, lowerCaseAttributeNames: true })

  parser.write(html)
  parser.end()
}

function scanInlineStyle(
  style: string,
  idx: Indexes,
  line: number,
  onHit: (feature: Feature, line: number) => void,
) {
  // Wrap in a rule so safeParser produces a Root with declarations
  const wrapped = `*{${style}}`
  try {
    const root = safeParser(wrapped)
    root.walkDecls((decl) => {
      if (idx.cssImportant && decl.important) onHit(idx.cssImportant, line)
      const fs = idx.cssProp.get(decl.prop)
      if (fs) for (const f of fs) onHit(f, line)
      if (idx.cssVariables && decl.prop.startsWith('--')) onHit(idx.cssVariables, line)
      const pvs = idx.cssPropValue.get(decl.prop)
      if (pvs) {
        const v = decl.value.trim().toLowerCase()
        for (const pv of pvs) if (v === pv.value) onHit(pv.feature, line)
      }
      if (idx.cssFunction.size || idx.cssUnit.size || idx.cssVariables || idx.cssModernColor) {
        try {
          valueParser(decl.value).walk((n) => {
            if (n.type === 'function') {
              const fname = n.value.toLowerCase()
              const fs2 = idx.cssFunction.get(fname)
              if (fs2) for (const f of fs2) onHit(f, line)
              if (idx.cssVariables && fname === 'var') onHit(idx.cssVariables, line)
              if (idx.cssModernColor && MODERN_COLOR_FNS.has(fname)) onHit(idx.cssModernColor, line)
            } else if (n.type === 'word') {
              const m = /^-?\d*\.?\d+([a-z%]+)$/i.exec(n.value)
              if (m) {
                const fs2 = idx.cssUnit.get(m[1].toLowerCase())
                if (fs2) for (const f of fs2) onHit(f, line)
              }
            }
          })
        } catch {}
      }
    })
  } catch {}
}

function labelFor(idx: Indexes, level: SupportLevel): string {
  const n = idx.nicenames
  if (level === 'unsupported') return n.unsupported ?? 'Not supported'
  if (level === 'mitigated') return n.mitigated ?? 'Partially supported'
  return n.unknown ?? 'Support unknown'
}

async function scan(
  rootFile: string,
  config: MaizzleConfig,
  componentDirs: string[],
  allowedClients: Set<string> | 'all',
): Promise<Issue[]> {
  const idx = await initCompatibility()
  if (!idx) return []

  const root = config.root ?? process.cwd()
  const componentMap = await buildComponentMap(root, componentDirs)
  const streams: FileStreams[] = []
  collectStreams(rootFile, componentMap, new Set(), streams)

  const issues: Issue[] = []
  const seen = new Set<string>()
  const resolvedCache = new Map<string, { level: SupportLevel, affected: string[] } | null>()
  const resolveSupport = (f: Feature) => {
    let cached = resolvedCache.get(f.slug)
    if (cached === undefined) {
      cached = computeSupport(f.stats, idx.familyNicenames, allowedClients)
      resolvedCache.set(f.slug, cached)
    }
    return cached
  }
  const add = (f: Feature, file: string, line?: number) => {
    const key = `${f.slug}|${file}|${line ?? 0}`
    if (seen.has(key)) return
    const support = resolveSupport(f)
    if (!support) return
    seen.add(key)
    issues.push({
      kind: 'compat',
      slug: f.slug, title: f.title, url: f.url, category: f.category,
      supportLevel: support.level, supportLabel: labelFor(idx, support.level),
      affectedClients: support.affected,
      line, file,
    })
  }

  // Stream A: compiled CSS from real pipeline — reflects shipped output
  // (Tailwind utilities resolved, @maizzle/tailwindcss imported, calc
  // resolved, modern CSS lowered). Filter hits whose containing selector
  // doesn't reference a user class — drops Tailwind preflight noise.
  // For hits without a class selector (e.g. @media, user-written rules),
  // attribute to the file that owned the style block.
  const compiledBlocks = await compileViaPipeline(streams, config, rootFile)
  for (const block of compiledBlocks) {
    walkCss(block.css, idx, (feature, node) => {
      const locations = classLocations(node.selector, streams)
      if (!locations.length) {
        add(feature, block.file, block.line)
        return
      }
      // @media features collapse to a single source line: the first usage
      // of whatever class/variant triggered the wrapper. Other features
      // show up for every occurrence.
      if (feature.slug.startsWith('css-at-media')) {
        add(feature, locations[0].file, locations[0].line)
      } else {
        for (const { file, line } of locations) add(feature, file, line)
      }
    })
  }

  // Stream C: source template per file
  for (const s of streams) {
    if (!s.template) continue
    walkTemplate(s.template.content, idx, s.template.offset, s.source,
      s.source.indexOf(s.template.content),
      (feature, line) => add(feature, s.path, line))
  }

  return issues
}

/**
 * Return every (file, line) where any class from the selector appears in a
 * template. Scans every stream so a shared utility class used in multiple
 * components surfaces once per occurrence.
 */
function classLocations(
  selector: string | undefined,
  streams: FileStreams[],
): Array<{ file: string, line: number }> {
  if (!selector) return []
  const classNames = extractSelectorClasses(selector)
  if (!classNames.length) return []
  const out: Array<{ file: string, line: number }> = []
  const seen = new Set<string>()
  for (const cn of classNames) {
    for (const s of streams) {
      if (!s.classes.has(cn) || !s.template) continue
      const tpl = s.template.content
      const tplStart = s.source.indexOf(tpl)
      let pos = 0
      while (true) {
        const i = tpl.indexOf(cn, pos)
        if (i < 0) break
        pos = i + cn.length
        // Whole-word boundary: adjacent char must be whitespace or quote
        const before = i > 0 ? tpl[i - 1] : ' '
        const after = i + cn.length < tpl.length ? tpl[i + cn.length] : ' '
        if (!isClassBoundary(before) || !isClassBoundary(after)) continue
        const line = offsetToLine(s.source, tplStart + i)
        const key = `${s.path}|${line}`
        if (seen.has(key)) continue
        seen.add(key)
        out.push({ file: s.path, line })
      }
    }
  }
  return out
}

function isClassBoundary(c: string): boolean {
  return c === ' ' || c === '\t' || c === '\n' || c === '\r' || c === '"' || c === "'"
}

function extractSelectorClasses(selector: string): string[] {
  const out: string[] = []
  const re = /\.((?:\\.|[\w-])+)/g
  let m
  while ((m = re.exec(selector)) !== null) {
    out.push(m[1].replace(/\\(.)/g, '$1'))
  }
  return out
}

const CATEGORY_ORDER = ['css', 'html', 'image', 'others']
const LEVEL_ORDER: Record<string, number> = { error: 0, unsupported: 1, warning: 2, mitigated: 3, unknown: 4 }

function orderKey(i: Issue): number {
  if (i.kind === 'lint') return LEVEL_ORDER[i.severity!] ?? 99
  return LEVEL_ORDER[i.supportLevel!] ?? 99
}

function resolveChecksConfig(config: MaizzleConfig) {
  const raw = (config as any).server?.checks
  if (raw === false) return null
  const clients: Set<string> | 'all' = raw?.clients === 'all'
    ? 'all'
    : Array.isArray(raw?.clients) && raw.clients.length
      ? new Set(raw.clients as string[])
      : DEFAULT_CLIENTS
  const level: 'error' | 'warning' | 'lint' | null = raw?.level ?? null
  return { clients, level }
}

function passesLevelFilter(issue: Issue, level: 'error' | 'warning' | 'lint' | null): boolean {
  if (!level) return true
  if (level === 'lint') return issue.kind === 'lint'
  if (issue.kind === 'lint') {
    return level === 'error' ? issue.severity === 'error' : issue.severity === 'warning'
  }
  // compat
  return level === 'error'
    ? issue.supportLevel === 'unsupported'
    : issue.supportLevel === 'mitigated' || issue.supportLevel === 'unknown'
}

export async function serveCompatibility(
  url: string,
  res: any,
  config: MaizzleConfig,
  componentDirs: string[],
) {
  const filePath = url.replace('/__maizzle/compatibility/', '').replace(/\?.*$/, '')
  const checksCfg = resolveChecksConfig(config)
  try {
    res.setHeader('Content-Type', 'application/json')
    if (!checksCfg) {
      // Defensive: UI hides the tab using window.__MAIZZLE_CONFIG__ so it
      // shouldn't reach this endpoint when disabled, but if something else
      // does, return an empty list.
      res.end(JSON.stringify([]))
      return
    }
    const absolutePath = resolve(filePath)
    const [compatIssues, lintIssues] = await Promise.all([
      scan(absolutePath, config, componentDirs, checksCfg.clients),
      scanLint(absolutePath, config, componentDirs),
    ])

    const idx = await initCompatibility()
    const lintAsIssues: Issue[] = lintIssues.map((li) => {
      const info = li.slug ? idx?.bySlug.get(li.slug) : undefined
      return {
        kind: 'lint',
        slug: li.slug,
        title: li.title,
        url: info?.url,
        category: li.category,
        severity: li.type,
        message: li.message,
        line: li.line,
        file: li.file,
      }
    })

    let issues: Issue[] = [...compatIssues, ...lintAsIssues]
    if (checksCfg.level) issues = issues.filter((i) => passesLevelFilter(i, checksCfg.level))
    issues.sort((a, b) => {
      const c = CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category)
      if (c) return c
      const l = orderKey(a) - orderKey(b)
      if (l) return l
      return (a.slug ?? a.title).localeCompare(b.slug ?? b.title)
    })
    res.end(JSON.stringify(issues))
  } catch (error: any) {
    res.statusCode = 500
    res.end(JSON.stringify({ error: error.message }))
  }
}

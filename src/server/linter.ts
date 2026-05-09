import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseSfcBlocks, findComponentTags, buildComponentMap } from './sfc-utils.ts'
import type { MaizzleConfig } from '../types/index.ts'
import type { NormalizedComponentSource } from '../utils/componentSources.ts'

export interface LintIssue {
  type: 'error' | 'warning'
  title: string
  message: string
  /** Which tab this lands in when merged into the Checks panel. */
  category: 'css' | 'html' | 'image' | 'others'
  /** Optional caniemail slug for URL enrichment (e.g. "html-html"). */
  slug?: string
  line?: number
  file: string
}

interface Presence {
  html: boolean
  head: boolean
  body: boolean
}

/**
 * Maizzle auto-adds role="none" to every <table> by default via the
 * addAttributes transformer. Warn about missing role only when that won't
 * happen:
 *   - useTransformers: false       → whole pipeline off
 *   - html.attributes.add: false   → auto-add disabled globally
 *   - add.table: false             → table selector opted out
 *   - add.table.role: false        → role attribute specifically opted out
 * An empty `add.table: {}` still inherits role via defu merge, so it's fine.
 */
function tableRoleAutoAdded(config: MaizzleConfig): boolean {
  if (config.useTransformers === false) return false
  const add = config.html?.attributes?.add
  if (add === false) return false
  if (!add || typeof add !== 'object') return true
  const table = (add as any).table
  if (table === false) return false
  if (table && typeof table === 'object' && table.role === false) return false
  return true
}

export async function scanLint(
  rootFile: string,
  config: MaizzleConfig,
  componentDirs: NormalizedComponentSource[],
): Promise<LintIssue[]> {
  const root = config.root ?? process.cwd()
  const componentMap = await buildComponentMap(root, componentDirs)
  const visited = new Set<string>()
  const presence: Presence = { html: false, head: false, body: false }
  const checkTableRole = !tableRoleAutoAdded(config)
  const issues = checkFile(rootFile, componentMap, visited, presence, checkTableRole)

  if (!presence.html) issues.push({ type: 'warning', category: 'html', title: 'Missing <html>', message: 'Root <html> tag not found in the template or any of its components.', slug: 'html-html', line: 1, file: rootFile })
  if (!presence.head) issues.push({ type: 'warning', category: 'html', title: 'Missing <head>', message: 'Root <head> tag not found in the template or any of its components.', slug: 'html-head', line: 1, file: rootFile })
  if (!presence.body) issues.push({ type: 'warning', category: 'html', title: 'Missing <body>', message: 'Root <body> tag not found in the template or any of its components.', slug: 'html-body', line: 1, file: rootFile })

  return issues
}

export async function serveLint(url: string, res: any, config: MaizzleConfig, componentDirs: NormalizedComponentSource[]) {
  const filePath = url.replace('/__maizzle/lint/', '').replace(/\?.*$/, '')

  try {
    const absolutePath = resolve(filePath)
    const issues = await scanLint(absolutePath, config, componentDirs)

    // Sort: errors first, then warnings, then by line
    issues.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'error' ? -1 : 1
      return (a.line ?? 0) - (b.line ?? 0)
    })

    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(issues))
  } catch (error: any) {
    res.statusCode = 500
    res.end(JSON.stringify({ error: error.message }))
  }
}

function checkFile(
  filePath: string,
  componentMap: Map<string, string>,
  visited: Set<string>,
  presence: Presence,
  checkTableRole: boolean,
): LintIssue[] {
  if (visited.has(filePath)) return []
  visited.add(filePath)

  let source: string
  try {
    source = readFileSync(filePath, 'utf-8')
  } catch {
    return []
  }

  const { template } = parseSfcBlocks(source)
  const issues: LintIssue[] = []

  if (template) {
    issues.push(...lintHtml(template.content, template.offset, filePath, presence, checkTableRole))

    // Recurse into components
    const componentTags = findComponentTags(template.content)
    for (const tag of componentTags) {
      const componentPath = componentMap.get(tag.toLowerCase())
      if (componentPath) {
        issues.push(...checkFile(componentPath, componentMap, visited, presence, checkTableRole))
      }
    }
  }

  return issues
}

function lineAt(html: string, offset: number, lineOffset: number): number {
  return html.slice(0, offset).split('\n').length + lineOffset
}

/**
 * True if the <img> tag has a width defined via any of:
 *   - `width` attribute
 *   - inline `style` with a `width` property
 *   - class attribute with a Tailwind `w-` utility (any variant prefix like
 *     sm:, hover:), or an arbitrary `[width:…]` utility
 */
function hasWidthDefined(imgTag: string): boolean {
  if (/\bwidth\s*=/i.test(imgTag)) return true

  const styleMatch = imgTag.match(/\bstyle\s*=\s*["']([^"']*)["']/i)
  if (styleMatch && /(^|[;\s])width\s*:/i.test(styleMatch[1])) return true

  const classMatch = imgTag.match(/\bclass\s*=\s*["']([^"']*)["']/i)
  if (classMatch) {
    const classes = classMatch[1]
    if (/(?:^|\s)(?:[a-z0-9-]+:)*w-\S+/i.test(classes)) return true
    if (/\[width:/i.test(classes)) return true
  }
  return false
}

function lintHtml(html: string, lineOffset: number, filePath: string, presence: Presence, checkTableRole: boolean): LintIssue[] {
  const issues: LintIssue[] = []

  // Match all tags (multiline) — [^>] doesn't cross > so use [\s\S] with lazy quantifier
  const tagRe = /<([a-zA-Z][a-zA-Z0-9]*)\b([\s\S]*?)>/g

  for (const m of Array.from(html.matchAll(tagRe))) {
    const tag = m[0]
    const tagName = m[1].toLowerCase()
    const line = lineAt(html, m.index!, lineOffset)

    if (tagName === 'html') presence.html = true
    else if (tagName === 'head') presence.head = true
    else if (tagName === 'body') presence.body = true

    // Layout tables — accessibility requires role="none" so screen readers
    // skip the table structure. Only surface the warning when the user has
    // disabled Maizzle's auto-role-add; otherwise every build-step output
    // already has role="none" set.
    if (checkTableRole && tagName === 'table') {
      const roleMatch = tag.match(/\brole\s*=\s*["']([^"']*)["']/i)
      if (!roleMatch) {
        const tableEndIdx = html.indexOf('</table>', m.index!)
        const inner = tableEndIdx >= 0 ? html.slice(m.index!, tableEndIdx) : ''
        const isDataTable = /<th\b/i.test(inner) || /<caption\b/i.test(inner)
        if (!isDataTable) {
          issues.push({ type: 'warning', category: 'html', title: 'Layout table missing role', message: 'Add role="none" so screen readers skip this layout table.', slug: 'html-role', line, file: filePath })
        }
      }
    }

    // Images
    if (tagName === 'img') {
      if (!/\balt\s*=/i.test(tag)) {
        issues.push({ type: 'warning', category: 'image', title: 'Missing alt text', message: 'Image is missing the alt attribute', line, file: filePath })
      }

      const srcMatch = tag.match(/\bsrc\s*=\s*["']([^"']*)["']/i)
      if (!srcMatch) {
        issues.push({ type: 'error', category: 'image', title: 'Missing image src', message: 'Image tag has no src attribute', line, file: filePath })
      } else if (!srcMatch[1].trim()) {
        issues.push({ type: 'error', category: 'image', title: 'Empty image src', message: 'Image src attribute is empty', line, file: filePath })
      } else if (srcMatch[1].trim().startsWith('http:')) {
        issues.push({ type: 'warning', category: 'image', title: 'Insecure image src', message: 'Image loads over HTTP instead of HTTPS', line, file: filePath })
      }

      if (!hasWidthDefined(tag)) {
        issues.push({ type: 'warning', category: 'image', title: 'Missing image width', message: 'Use a `width=""` attribute for best results in Outlook', line, file: filePath })
      }
    }

    // Any tag with href — skip resource tags handled below
    if (!['link', 'script', 'source'].includes(tagName)) {
      const hrefMatch = tag.match(/\bhref\s*=\s*["']([^"']*)["']/i)
      if (hrefMatch) {
        const href = hrefMatch[1].trim()
        if (!href) {
          issues.push({ type: 'error', category: 'html', title: 'Empty link href', message: 'Link href attribute is empty', line, file: filePath })
        } else if (href === '#' || href === '/') {
          issues.push({ type: 'error', category: 'html', title: 'Placeholder link', message: `Link href is "${href}"`, line, file: filePath })
        } else if (href.startsWith('http:')) {
          issues.push({ type: 'warning', category: 'html', title: 'Insecure link', message: 'Link uses HTTP instead of HTTPS', line, file: filePath })
        } else if (href.startsWith('http') && !/^https?:\/\/.+\..+/i.test(href)) {
          issues.push({ type: 'error', category: 'html', title: 'Invalid link', message: `Link href "${href}" looks malformed`, line, file: filePath })
        }
      }
    }

    // Insecure resources (<link>, <script>, <source>)
    if (['link', 'script', 'source'].includes(tagName)) {
      const attrMatch = tag.match(/\b(?:href|src)\s*=\s*["']([^"']*)["']/i)
      if (attrMatch && attrMatch[1].trim().startsWith('http:')) {
        issues.push({ type: 'warning', category: 'html', title: 'Insecure resource', message: 'Resource loads over HTTP instead of HTTPS', line, file: filePath })
      }
    }
  }

  // Insecure CSS url() references
  for (const m of Array.from(html.matchAll(/url\s*\(\s*["']?(http:[^"')]+)["']?\s*\)/gi))) {
    issues.push({ type: 'warning', category: 'css', title: 'Insecure CSS url()', message: 'CSS url() loads over HTTP instead of HTTPS', line: lineAt(html, m.index!, lineOffset), file: filePath })
  }

  // Check for unclosed tags (block-level and common inline elements)
  const voidElements = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr',
  ])

  const trackedTags = new Set([
    'a', 'b', 'body', 'div', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'head', 'html', 'i', 'li', 'ol', 'p', 'span', 'strong', 'style',
    'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'title', 'tr', 'u', 'ul',
  ])

  const stack: Array<{ tag: string, line: number }> = []

  // Strip comments and content inside <style>/<script> to avoid false matches
  const stripped = html
    .replace(/<!--[\s\S]*?-->/g, (m) => '\n'.repeat((m.match(/\n/g) || []).length))
    .replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1>/gi, (m) => '\n'.repeat((m.match(/\n/g) || []).length))

  const strippedLines = stripped.split('\n')

  for (let i = 0; i < strippedLines.length; i++) {
    const line = strippedLines[i]
    const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*\/?>/g
    let m

    while ((m = tagRegex.exec(line)) !== null) {
      const fullMatch = m[0]
      const tagName = m[1].toLowerCase()

      if (!trackedTags.has(tagName) || voidElements.has(tagName)) continue
      if (fullMatch.endsWith('/>')) continue

      if (fullMatch.startsWith('</')) {
        // Closing tag
        let lastOpen = -1
        for (let j = stack.length - 1; j >= 0; j--) {
          if (stack[j].tag === tagName) { lastOpen = j; break }
        }
        if (lastOpen !== -1) {
          stack.splice(lastOpen, 1)
        }
      } else {
        // Opening tag
        stack.push({ tag: tagName, line: i + 1 + lineOffset })
      }
    }
  }

  for (const unclosed of stack) {
    issues.push({
      type: 'error',
      category: 'html',
      title: 'Unclosed tag',
      message: `<${unclosed.tag}> tag is not closed`,
      line: unclosed.line,
      file: filePath,
    })
  }

  return issues
}

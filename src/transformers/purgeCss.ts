import { comb } from 'email-comb'
import { defu as merge } from 'defu'
import safeParser from 'postcss-safe-parser'
import { selectAll } from 'css-select'
import type { ChildNode, Element } from 'domhandler'
import type { Opts as CombOptions } from 'email-comb'
import { parse, serialize, walk } from '../utils/ast/index.ts'

const DEFAULT_SAFELIST: string[] = [
  '*body*', // Gmail
  '.gmail*', // Gmail
  '.apple*', // Apple Mail
  '.ios*', // Mail on iOS
  '.ox-*', // Open-Xchange
  '.outlook*', // Outlook.com
  '[data-ogs*', // Outlook.com
  '.bloop_container', // Airmail
  '.Singleton', // Apple Mail 10
  '.unused', // Notes 8
  '.moz-text-html', // Thunderbird
  '.mail-detail-content', // Comcast, Libero webmail
  '*edo*', // Edison (all)
  '#*', // Freenet uses #msgBody
  '.lang*', // Fenced code blocks
]

const DEFAULT_OPTIONS = {
  backend: [
    { heads: '{{', tails: '}}' },
    { heads: '{%', tails: '%}' },
  ],
  whitelist: [...DEFAULT_SAFELIST],
}

/**
 * Options for the `purgeCss` transformer.
 */
export interface PurgeCssOptions extends Partial<Omit<CombOptions, 'whitelist'>> {
  /**
   * Selectors to preserve regardless of whether they're matched in the
   * markup. Appended to Maizzle's built-in safelist (Gmail, Apple Mail,
   * Outlook.com hooks, etc). Mapped to email-comb's `whitelist` option.
   */
  safelist?: string[]
}

/**
 * Remove unused CSS from an HTML string.
 *
 * Uses `email-comb` together with a DOM-aware deep-purge step to strip
 * CSS selectors and class/id references that are not matched anywhere
 * in the document body.
 *
 * @param html    HTML string to transform.
 * @param options Email-comb options plus a Maizzle `safelist`.
 * @returns       The transformed HTML string.
 *
 * @example
 * import { purgeCss } from '@maizzle/framework'
 *
 * const out = purgeCss('<style>.a{}.b{}</style><p class="a">x</p>', {
 *   safelist: ['.keep'],
 * })
 */
export function purgeCss(html: string, options: PurgeCssOptions = {}): string {
  return serialize(purgeCssDom(parse(html), options))
}

/**
 * DOM-form of {@link purgeCss} used by the internal transformer
 * pipeline. Takes a parsed DOM, returns a parsed DOM — avoids redundant
 * serialize/parse round-trips when chained with other transformers.
 */
export function purgeCssDom(dom: ChildNode[], options: PurgeCssOptions = {}): ChildNode[] {
  const userSafelist = Array.isArray(options.safelist) ? options.safelist : []

  const { safelist: _discard, ...restUserOptions } = options

  // Merge user options on top of defaults.
  // defu merges objects deeply; for arrays it appends user values.
  // We want the user safelist appended to the default safelist,
  // so we build whitelist manually.
  const combOptions = merge(
    { ...restUserOptions, whitelist: [...DEFAULT_SAFELIST, ...userSafelist] },
    DEFAULT_OPTIONS,
  )

  // Deep purge first: DOM-aware selector removal using PostCSS + css-select.
  // Runs before email-comb so that email-comb can clean up orphaned classes
  // in HTML attributes left behind by removed CSS rules.
  const safelist = [...DEFAULT_SAFELIST, ...userSafelist]
  dom = deepPurge(dom, safelist)

  /**
   * Shield embed style tags from email-comb. Comb has no skip option,
   * so it strips CSS comments and drops class refs it can't match
   * against visible CSS. Swap each embed tag's body for a unique
   * stub rule (`.maizzle-keep-N{}`) so comb keeps the tag, then
   * whitelist that stub plus every selector from the original
   * CSS so comb leaves matching refs alone elsewhere — and
   * finally restore the original CSS once comb has run.
   */
  const stash: { token: string; original: string; textNode: any }[] = []
  const extraWhitelist: string[] = []
  walk(dom, (node) => {
    const el = node as Element
    if (el.name !== 'style' || !el.attribs) return
    if (!('embed' in el.attribs) && !('data-embed' in el.attribs)) return
    const textNode = el.children?.find((c: any) => c.type === 'text') as any
    if (!textNode?.data) return
    const idx = stash.length
    const token = `.maizzle-keep-${idx}`
    extraWhitelist.push(token)
    for (const m of textNode.data.matchAll(/(?<![\w-])[.#][a-zA-Z_][\w-]*/g)) {
      extraWhitelist.push(m[0])
    }
    stash.push({ token, original: textNode.data, textNode })
    textNode.data = `${token}{}`
  })

  if (extraWhitelist.length) {
    combOptions.whitelist = [...(combOptions.whitelist as string[] ?? []), ...extraWhitelist]
  }

  const { result } = comb(serialize(dom), combOptions)

  /**
   * Comb returns a fresh string, so we work off the post-parse tree:
   * find each embed style tag whose body still starts with the stub
   * token we planted earlier and swap the original CSS back in.
   */
  let purgedDom = parse(result)

  if (stash.length) {
    walk(purgedDom, (node) => {
      const el = node as Element
      if (el.name !== 'style' || !el.attribs) return
      if (!('embed' in el.attribs) && !('data-embed' in el.attribs)) return
      const textNode = el.children?.find((c: any) => c.type === 'text') as any
      if (!textNode?.data) return
      const trimmed = textNode.data.trim()
      const match = stash.find(s => trimmed === `${s.token}{}` || trimmed.startsWith(`${s.token}{`))
      if (match) textNode.data = match.original
    })
  }

  // Clean up data-embed/embed attributes — no longer needed after purging
  walk(purgedDom, (node) => {
    const el = node as Element
    if (el.name === 'style' && el.attribs) {
      delete el.attribs['data-embed']
      delete el.attribs.embed
    }
  })

  return purgedDom
}

/**
 * Deep purge: uses PostCSS to parse CSS in non-embedded style tags,
 * then checks each selector against the DOM with css-select.
 * Removes rules where no selector matches any element.
 */
function isSafelisted(selector: string, safelist: string[]): boolean {
  return safelist.some((pattern) => {
    if (pattern.startsWith('*') && pattern.endsWith('*')) {
      return selector.includes(pattern.slice(1, -1))
    }
    if (pattern.endsWith('*')) {
      return selector.startsWith(pattern.slice(0, -1))
    }
    if (pattern.startsWith('*')) {
      return selector.endsWith(pattern.slice(1))
    }
    return selector === pattern
  })
}

function deepPurge(dom: ChildNode[], safelist: string[]): ChildNode[] {
  walk(dom, (node) => {
    const el = node as Element

    if (el.name !== 'style' || !el.attribs) return
    if ('data-embed' in el.attribs || 'embed' in el.attribs) return

    const textNode = el.children?.find((c: any) => c.type === 'text') as any
    if (!textNode?.data?.trim()) return

    const root = safeParser(textNode.data)

    root.walkRules((rule) => {
      // Skip rules inside @media or other at-rules — those may target
      // states we can't match statically (hover, responsive, etc.)
      if (rule.parent?.type === 'atrule') return

      const selectors = rule.selectors ?? [rule.selector]
      const matched = selectors.filter((sel) => {
        // Keep safelisted selectors
        if (isSafelisted(sel, safelist)) return true

        // Skip pseudo-classes/elements that can't be matched statically.
        // Functional pseudos like :not(), :is(), :where(), :has() are
        // matchable by css-select, so we only skip dynamic/state ones.
        if (/::[\w-]/.test(sel)) return true
        if (/(?<!:):(?!not\b|is\b|where\b|has\b)[\w-]/.test(sel.replace(/\\./g, ''))) return true

        try {
          return selectAll(sel, dom).length > 0
        } catch {
          // If css-select can't parse the selector, keep it
          return true
        }
      })

      if (matched.length === 0) {
        rule.remove()
      } else if (matched.length < selectors.length) {
        rule.selectors = matched
      }
    })

    // Remove empty at-rules
    root.walkAtRules((atRule) => {
      if (atRule.nodes?.length === 0) {
        atRule.remove()
      }
    })

    const purgedCss = root.toString()

    if (purgedCss.trim()) {
      textNode.data = purgedCss
    } else {
      // Remove the style tag entirely if empty
      const parent = el.parent
      if (parent && 'children' in parent) {
        const idx = parent.children.indexOf(el as any)
        if (idx !== -1) parent.children.splice(idx, 1)
      }
    }
  })

  return dom
}

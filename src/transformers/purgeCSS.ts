import { comb } from 'email-comb'
import { defu as merge } from 'defu'
import postcss from 'postcss'
import safeParser from 'postcss-safe-parser'
import { selectAll } from 'css-select'
import type { ChildNode, Element } from 'domhandler'
import { parse, serialize, walk } from '../utils/ast/index.ts'
import type { CssConfig } from '../types/config.ts'

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
 * Remove unused CSS transformer.
 *
 * Uses `email-comb` to strip CSS selectors and corresponding class/id
 * references that are not matched anywhere in the HTML body.
 *
 * Enable by setting `css.purge: true` (or passing options).
 * The user-supplied options are merged on top of the defaults, so
 * `safelist` values are **appended** to the built-in safelist rather
 * than replacing it.
 *
 * Accepts `ChildNode[]` as input, serializes internally before passing
 * to email-comb (which requires a raw HTML string), then parses the
 * result back to `ChildNode[]` so it fits in the DOM pipeline.
 */
export function purgeCSS(dom: ChildNode[], config: CssConfig = {}): ChildNode[] {
  const option = config.purge

  if (!option) return dom

  const userOptions = typeof option === 'object' ? option : {}

  // Merge user options on top of defaults.
  // defu merges objects deeply; for arrays it appends user values.
  // We want the user safelist appended to the default safelist,
  // so we build whitelist manually.
  const userSafelist = Array.isArray((userOptions as any).safelist)
    ? (userOptions as any).safelist as string[]
    : []

  const { safelist: _discard, ...restUserOptions } = userOptions as any

  const options = merge(
    { ...restUserOptions, whitelist: [...DEFAULT_SAFELIST, ...userSafelist] },
    DEFAULT_OPTIONS,
  )

  // Deep purge first: DOM-aware selector removal using PostCSS + css-select.
  // Runs before email-comb so that email-comb can clean up orphaned classes
  // in HTML attributes left behind by removed CSS rules.
  const safelist = [...DEFAULT_SAFELIST, ...userSafelist]
  dom = deepPurge(dom, safelist)

  const { result } = comb(serialize(dom), options)

  let purgedDom = parse(result)

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
    if ('data-embed' in el.attribs) return

    const textNode = el.children?.find((c: any) => c.type === 'text') as any
    if (!textNode?.data?.trim()) return

    const root = postcss.parse(textNode.data, { parser: safeParser })

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

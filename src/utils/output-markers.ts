import { parse, serialize } from './ast/index.ts'
import type { ChildNode, Element } from 'domhandler'

/**
 * Sentinel attributes the `<Plaintext>` and `<NotPlaintext>`
 * components stamp on their wrapper `<div>` so the build step
 * can route their slot content to one output and remove it
 * entirely from the other.
 */
export const PLAINTEXT_ONLY_ATTR = 'data-maizzle-plaintext-only'
export const HTML_ONLY_ATTR = 'data-maizzle-html-only'

type Op = 'drop' | 'unwrap'
type Rule = readonly [attr: string, op: Op]

const isElement = (n: ChildNode): n is Element => n.type === 'tag'

/**
 * Apply marker rules to a forest of nodes.
 *
 * - `drop` removes the matched element and its descendants.
 * - `unwrap` removes the wrapper element but keeps its children,
 *   splicing them into the parent's child list in place.
 *
 * Non-matching elements recurse so nested markers are handled.
 */
function applyRules(nodes: ChildNode[], rules: readonly Rule[]): ChildNode[] {
  const out: ChildNode[] = []
  for (const n of nodes) {
    if (isElement(n)) {
      const match = rules.find(([attr]) => n.attribs?.[attr] !== undefined)
      if (match) {
        const [, op] = match
        if (op === 'drop') continue
        out.push(...applyRules((n.children ?? []) as ChildNode[], rules))
        continue
      }
      if (n.children?.length) {
        n.children = applyRules(n.children as ChildNode[], rules) as Element['children']
      }
    }
    out.push(n)
  }
  return out
}

const hasMarkers = (html: string): boolean =>
  html.includes(PLAINTEXT_ONLY_ATTR) || html.includes(HTML_ONLY_ATTR)

/**
 * Strip output markers for the HTML output: drop plaintext-only
 * subtrees entirely, unwrap html-only wrappers (keep children).
 *
 * When no markers are present, the input is returned unchanged so
 * the post-transformer formatting (prettify, XHTML self-closing
 * slashes, etc.) survives intact for the typical case.
 */
export function stripForHtml(html: string): string {
  if (!hasMarkers(html)) return html
  const isXhtml = /<!DOCTYPE\s+[^>]*xhtml/i.test(html)
  return serialize(applyRules(parse(html), [
    [PLAINTEXT_ONLY_ATTR, 'drop'],
    [HTML_ONLY_ATTR, 'unwrap'],
  ]), { selfClosingTags: isXhtml })
}

/**
 * Strip output markers for the plaintext source: drop html-only
 * subtrees entirely, unwrap plaintext-only wrappers (keep children).
 *
 * The result is fed to `createPlaintext`, which then strips all
 * remaining tags via `string-strip-html`.
 */
export function stripForPlaintext(html: string): string {
  if (!hasMarkers(html)) return html
  return serialize(applyRules(parse(html), [
    [HTML_ONLY_ATTR, 'drop'],
    [PLAINTEXT_ONLY_ATTR, 'unwrap'],
  ]))
}

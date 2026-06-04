import postcss from 'postcss'
import safeParser from 'postcss-safe-parser'
import mergeLonghand from 'postcss-merge-longhand'
import type { ChildNode, Element } from 'domhandler'
import { parse, serialize, walk } from '../utils/ast/index.ts'

/**
 * Options for the `shorthandCss` transformer.
 */
export interface ShorthandCssOptions {
  /**
   * Restrict the transform to a list of HTML tag names. Omit to apply to
   * every element with a `style` attribute.
   *
   * @example ['td', 'div']
   */
  tags?: string[]
}

/**
 * Rewrite longhand CSS inside inline `style` attributes with shorthand
 * syntax. Works with margin, padding, and border when all sides are
 * specified.
 *
 * For example:
 * `margin-left: 2px; margin-right: 2px; margin-top: 4px; margin-bottom: 4px`
 * becomes:
 * `margin: 4px 2px`
 *
 * @param html    HTML string to transform.
 * @param options Optional Maizzle options (`tags`).
 * @returns       The transformed HTML string.
 *
 * @example
 * import { shorthandCss } from '@maizzle/framework'
 *
 * const out = shorthandCss(
 *   '<p style="margin-top: 4px; margin-right: 2px; margin-bottom: 4px; margin-left: 2px;">x</p>',
 *   { tags: ['p'] },
 * )
 */
export function shorthandCss(html: string, options: ShorthandCssOptions = {}): string {
  return serialize(shorthandCssDom(parse(html), options))
}

/**
 * DOM-form of {@link shorthandCss} used by the internal transformer
 * pipeline. Takes a parsed DOM, returns a parsed DOM — avoids redundant
 * serialize/parse round-trips when chained with other transformers.
 */
export function shorthandCssDom(dom: ChildNode[], options: ShorthandCssOptions = {}): ChildNode[] {
  const allowedTags = options.tags ?? []
  const hasTagFilter = allowedTags.length > 0

  /**
   * Merge longhand within a single inline-style value. Returns the merged
   * string when shorter, otherwise the original. Wraps the value in a
   * dummy selector since postcss-merge-longhand operates on rules.
   */
  const mergeStyleValue = (styleValue: string): string => {
    try {
      const { css } = postcss()
        .use(mergeLonghand)
        .process(`div { ${styleValue} }`, { parser: safeParser })
      const match = css.match(/div\s*\{\s*([^}]+)\s*\}/)
      if (match && match[1]) {
        const merged = match[1].trim()
        if (merged !== styleValue) return merged
      }
    }
    catch {}
    return styleValue
  }

  walk(dom, (node) => {
    /**
     * MSO conditional comments carry their own inline-style attributes
     * (e.g. `<!--[if mso]><td style="…"><![endif]-->`) as opaque text.
     * The element walker can't see them, so without this branch the td/
     * v:rect styles inside comments stay longhand even when the visible
     * div has already been merged. Match each `style="…"` substring,
     * run it through mergeLonghand, splice back.
     *
     * Tag filter intentionally bypassed: the user can't address MSO td
     * elements (they don't parse as elements), and these comments
     * always wrap email-layout primitives anyway.
     */
    if (node.type === 'comment') {
      const data = (node as any).data as string
      if (!data || !data.includes('style="')) return
      const newData = data.replace(/style="([^"]*)"/g, (full, value) => {
        const merged = mergeStyleValue(value)
        return merged === value ? full : `style="${merged}"`
      })
      if (newData !== data) (node as any).data = newData
      return
    }

    const el = node as Element

    if (!el.attribs?.style) return
    if (hasTagFilter && !allowedTags.includes(el.name)) return

    const merged = mergeStyleValue(el.attribs.style)
    if (merged !== el.attribs.style) el.attribs.style = merged
  })

  return dom
}

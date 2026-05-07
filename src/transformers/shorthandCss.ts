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

  walk(dom, (node) => {
    const el = node as Element

    // Skip if no attribs or no style
    if (!el.attribs?.style) {
      return
    }

    // Skip if tag filter is active and this tag is not allowed
    if (hasTagFilter && !allowedTags.includes(el.name)) {
      return
    }

    const styleValue = el.attribs.style

    try {
      // Process the style with postcss-merge-longhand
      // Wrap in a dummy selector since postcss needs a rule
      const { css } = postcss()
        .use(mergeLonghand)
        .process(`div { ${styleValue} }`, { parser: safeParser })

      // Extract the content between the braces
      const match = css.match(/div\s*\{\s*([^}]+)\s*\}/)
      if (match && match[1]) {
        const newStyle = match[1].trim()
        if (newStyle !== styleValue) {
          el.attribs.style = newStyle
        }
      }
    } catch {
      // If processing fails, keep the original style
    }
  })

  return dom
}

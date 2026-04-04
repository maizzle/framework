import postcss from 'postcss'
import safeParser from 'postcss-safe-parser'
import mergeLonghand from 'postcss-merge-longhand'
import type { ChildNode, Element } from 'domhandler'
import { walk } from '../utils/ast/index.ts'
import type { CssConfig } from '../types/config.ts'

interface ShorthandCssOptions {
  tags?: string[]
}

/**
 * Shorthand CSS transformer.
 *
 * Rewrites longhand CSS inside `style` attributes with shorthand syntax.
 * Works with margin, padding, and border when all sides are specified.
 *
 * For example:
 * `margin-left: 2px; margin-right: 2px; margin-top: 4px; margin-bottom: 4px`
 * becomes:
 * `margin: 4px 2px`
 *
 * Enabled via `css.shorthand`:
 * - `true`: enable for all tags
 * - `{ tags: ['td', 'div'] }`: enable only for specified tags
 * - `false` or omitted: disabled
 */
export function shorthandCSS(dom: ChildNode[], config: CssConfig = {}): ChildNode[] {
  const option = config.shorthand

  // Disabled by default
  if (!option) {
    return dom
  }

  // Parse options
  const options: ShorthandCssOptions = typeof option === 'object' ? option : {}
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

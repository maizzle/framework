import { parse, serialize } from '../utils/ast/index.ts'
import { inlineLink } from './inlineLink.ts'
import { tailwindcss } from './tailwindcss.ts'
import { safeClassNames } from './safeClassNames.ts'
import { attributeToStyle } from './attributeToStyle.ts'
import { inlineCSS } from './inlineCSS.ts'
import { removeAttributes } from './removeAttributes.ts'
import { shorthandCSS } from './shorthandCSS.ts'
import { addAttributes } from './addAttributes.ts'
import { filters } from './filters/index.ts'
import { base } from './base.ts'
import { entities } from './entities.ts'
import { urlQuery } from './urlQuery.ts'
import { purgeCSS } from './purgeCSS.ts'
import { replaceStrings } from './replaceStrings.ts'
import { format } from './format.ts'
import { minify } from './minify.ts'
import type { MaizzleConfig } from '../types/config.ts'

/**
 * Run all Maizzle transformers on the rendered HTML.
 *
 * The HTML is parsed into a DOM once at the start and passed through all
 * DOM-based transformers as a shared `ChildNode[]`. After all DOM transformers
 * complete, the DOM is serialized back to a string exactly once.
 *
 * String-only transformers (those that rely on external tools that require a
 * raw HTML string) then run on the serialized output.
 *
 * Transformers run in a specific order:
 * 0.  Inline link stylesheets — replace `<link rel="stylesheet">` with `<style>` tags
 * 1.  Tailwind CSS — compile CSS, lower syntax, optimize (cleanup + merge media queries)
 * 2.  Safe class names
 * 3.  Attribute to style
 * 4.  CSS inliner
 * 5.  Remove attributes
 * 6.  Shorthand CSS
 * 7.  Add attributes
 * 8.  Filters
 * 9.  Base URL
 * 10. URL query
 * 11. Purge CSS (serializes/parses internally around email-comb)
 * 12. Entities
 * + Vue-generated comments stripped here (on serialized string)
 * 13. Replace strings
 * 14. Prettify
 * 15. Minify
 */
export async function runTransformers(
  html: string,
  config: MaizzleConfig,
  filePath?: string,
  doctype?: string,
): Promise<string> {
  // Parse once — all DOM transformers share this array
  let dom = parse(html)

  // 0. Inline <link> stylesheets
  dom = await inlineLink(dom, filePath)

  // 1. Tailwind CSS — always runs first
  dom = await tailwindcss(dom, config, filePath)

  // 2. Safe class names
  dom = safeClassNames(dom, config.css)

  // 3. Attribute to style
  dom = attributeToStyle(dom, config.css)

  // 4. CSS inliner (serializes/parses internally around juice)
  dom = inlineCSS(dom, config.css)

  // 5. Remove attributes
  dom = removeAttributes(dom, config.html?.attributes)

  // 6. Shorthand CSS
  dom = shorthandCSS(dom, config.css)

  // 7. Add attributes
  dom = addAttributes(dom, config.html?.attributes)

  // 8. Filters
  dom = filters(dom, config.filters)

  // 9. Base URL (serializes/parses internally for VML/MSO regex passes)
  dom = base(dom, config.url)

  // 10. URL query
  dom = urlQuery(dom, config.url)

  // 11. Purge CSS (serializes/parses internally around email-comb)
  dom = purgeCSS(dom, config.css)

  // 12. Entities
  dom = entities(dom, config.html?.decodeEntities)

  // Serialize once — remaining transformers operate on the HTML string
  const isXhtml = doctype ? /xhtml/i.test(doctype) : false
  let result = serialize(dom, { selfClosingTags: isXhtml })

  // Remove Vue-generated comments after serializing
  result = result
    .replaceAll('<!--[-->', '')
    .replaceAll('<!--]-->', '')
    .replaceAll('<!--teleport start anchor-->', '')
    .replaceAll('<!--teleport anchor-->', '')
    .replaceAll('<!--teleport start-->', '')
    .replaceAll('<!--teleport end-->', '')

  // 13. Replace strings
  result = replaceStrings(result, config)

  // 14. Format
  result = await format(result, config)

  // 15. Minify
  result = minify(result, config)

  // Strip self-closing slashes for HTML5 doctypes
  if (!isXhtml) {
    result = result.replace(/ \/>/g, '>')
  }

  return result
}

import { parse, serialize } from '../utils/ast/index.ts'
import { inlineLink } from './inlineLink.ts'
import { tailwindcss } from './tailwindcss.ts'
import { safeClassNames } from './safeClassNames.ts'
import { attributeToStyle } from './attributeToStyle.ts'
import { inlineCSS } from './inlineCSS.ts'
import { removeAttributes } from './removeAttributes.ts'
import { shorthandCSS } from './shorthandCSS.ts'
import { addAttributes } from './addAttributes.ts'
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
 * 8.  Base URL
 * 9.  URL query
 * 10. Purge CSS (serializes/parses internally around email-comb)
 * 11. Entities
 * + Vue-generated comments stripped here (on serialized string)
 * 12. Replace strings
 * 13. Prettify
 * 14. Minify
 */
export async function runTransformers(
  html: string,
  config: MaizzleConfig,
  filePath?: string,
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

  // 8. Base URL (serializes/parses internally for VML/MSO regex passes)
  dom = base(dom, config.url)

  // 9. URL query
  dom = urlQuery(dom, config.url)

  // 10. Purge CSS (serializes/parses internally around email-comb)
  dom = purgeCSS(dom, config.css)

  // 11. Entities
  dom = entities(dom, config.html?.decodeEntities)

  // Serialize once — remaining transformers operate on the HTML string
  let result = serialize(dom)

  // Remove Vue-generated comments after serializing
  result = result
    .replaceAll('<!--[-->', '')
    .replaceAll('<!--]-->', '')

  // 12. Replace strings
  result = replaceStrings(result, config)

  // 13. Format
  result = await format(result, config)

  // 14. Minify
  result = minify(result, config)

  return result
}

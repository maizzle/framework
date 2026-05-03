import { parse, serialize } from '../utils/ast/index.ts'
import { inlineLink } from './inlineLink.ts'
import { tailwindComponent } from './tailwindComponent.ts'
import { tailwindcss } from './tailwindcss.ts'
import { safeClassNames } from './safeClassNames.ts'
import { attributeToStyle } from './attributeToStyle.ts'
import { inlineCSS } from './inlineCSS.ts'
import { msoPlaceholders } from './msoPlaceholders.ts'
import { columnWidth } from './columnWidth.ts'
import { removeAttributes } from './removeAttributes.ts'
import { shorthandCSS } from './shorthandCSS.ts'
import { sixHex } from './sixHex.ts'
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
import type { TailwindBlock } from '../composables/renderContext.ts'

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
 * 7.  Six-digit HEX
 * 8.  Add attributes
 * 9.  Filters
 * 10. Base URL
 * 11. URL query
 * 12. Purge CSS (serializes/parses internally around email-comb)
 * 13. Entities
 * + Vue-generated comments stripped here (on serialized string)
 * 14. Replace strings
 * 15. Prettify
 * 16. Minify
 */
export async function runTransformers(
  html: string,
  config: MaizzleConfig,
  filePath?: string,
  doctype?: string,
  tailwindBlocks?: TailwindBlock[],
): Promise<string> {
  // Per-transformer skip map — only honored when useTransformers is an object.
  // Whole-pipeline opt-out (`useTransformers === false`) is handled upstream
  // in build.ts / render so we never reach this function in that case.
  const toggles = typeof config.useTransformers === 'object' ? config.useTransformers : null
  const enabled = (key: keyof NonNullable<typeof toggles>) => toggles?.[key] !== false

  // Parse once — all DOM transformers share this array
  let dom = parse(html)

  // 0. Inline <link> stylesheets
  dom = await inlineLink(dom, filePath)

  // 0.5. <Tailwind> component — compile per-block scoped CSS, inject into <head>
  if (tailwindBlocks?.length) {
    dom = await tailwindComponent(dom, tailwindBlocks, config, filePath)
  }

  // 1. Tailwind CSS — always runs first
  dom = await tailwindcss(dom, config, filePath)

  // 2. Safe class names
  if (enabled('safeClassNames')) dom = safeClassNames(dom, config.css)

  // 3. Attribute to style
  if (enabled('attributeToStyle')) dom = attributeToStyle(dom, config.css)

  // 4. CSS inliner (serializes/parses internally around juice)
  if (enabled('inlineCSS')) dom = inlineCSS(dom, config.css)

  // 4.5. Resolve MSO placeholders (table width + td style) from inlined CSS
  dom = msoPlaceholders(dom)

  // 4.6. Resolve Column min-width placeholders from nearest sized ancestor
  dom = columnWidth(dom)

  // 5. Remove attributes
  if (enabled('removeAttributes')) dom = removeAttributes(dom, config.html?.attributes)

  // 6. Shorthand CSS
  if (enabled('shorthandCSS')) dom = shorthandCSS(dom, config.css)

  // 7. Six-digit HEX
  if (enabled('sixHex')) dom = sixHex(dom, config.css)

  // 8. Add attributes
  if (enabled('addAttributes')) dom = addAttributes(dom, config.html?.attributes)

  // 9. Filters
  if (enabled('filters')) dom = filters(dom, config.filters)

  // 10. Base URL (serializes/parses internally for VML/MSO regex passes)
  if (enabled('baseURL')) dom = base(dom, config.url)

  // 11. URL query
  if (enabled('urlQuery')) dom = urlQuery(dom, config.url)

  // 12. Purge CSS (serializes/parses internally around email-comb)
  if (enabled('purgeCSS')) dom = purgeCSS(dom, config.css)

  // 13. Entities
  if (enabled('entities')) dom = entities(dom, config.html?.decodeEntities)

  // Serialize once — remaining transformers operate on the HTML string
  const isXhtml = doctype ? /xhtml/i.test(doctype) : false
  let result = serialize(dom, { selfClosingTags: isXhtml })

  // 14. Replace strings
  if (enabled('replaceStrings')) result = replaceStrings(result, config)

  // 15. Format
  if (enabled('prettify')) result = await format(result, config)

  // 16. Minify
  if (enabled('minify')) result = minify(result, config)

  // Strip self-closing slashes for HTML5 doctypes, but preserve content
  // inside MSO conditional comments (which are XML-ish and case/syntax sensitive).
  if (!isXhtml) {
    result = result.replace(
      /<!--\[if [^\]]*\]>[\s\S]*?<!\[endif\]-->|( \/>)/g,
      (match, selfClose) => selfClose ? '>' : match,
    )
  }

  return result
}

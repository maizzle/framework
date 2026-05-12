import { parse, serialize } from '../utils/ast/index.ts'
import { inlineLinkDom } from './inlineLink.ts'
import { tailwindComponent } from './tailwindComponent.ts'
import { tailwindcss } from './tailwindcss.ts'
import { safeClassNamesDom } from './safeClassNames.ts'
import { attributeToStyleDom } from './attributeToStyle.ts'
import { inlineCssDom } from './inlineCss.ts'
import { msoPlaceholders } from './msoPlaceholders.ts'
import { columnWidth } from './columnWidth.ts'
import { removeAttributesDom } from './removeAttributes.ts'
import { shorthandCssDom } from './shorthandCss.ts'
import { sixHexDom } from './sixHex.ts'
import { addAttributesDom } from './addAttributes.ts'
import { filtersDom } from './filters/index.ts'
import { baseDom } from './base.ts'
import { entitiesDom } from './entities.ts'
import { urlQueryDom } from './urlQuery.ts'
import { purgeCssDom } from './purgeCss.ts'
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
  //
  // A toggle set to `true` *force-enables* its transformer for this run by
  // layering on the matching config slice (e.g. `prettify: true` sets
  // `html.format = true`). This only applies to transformers whose
  // enable flag is a plain boolean — data-driven ones (filters,
  // baseURL, urlQuery, etc.) need actual config values, so a
  // bare `true` for those is a no-op.
  const toggles = typeof config.useTransformers === 'object' ? config.useTransformers : null
  const enabled = (key: keyof NonNullable<typeof toggles>) => toggles?.[key] !== false

  let effective = config
  if (toggles) {
    const cssOver: Record<string, unknown> = {}
    const htmlOver: Record<string, unknown> = {}
    if (toggles.inlineCss === true) cssOver.inline = true
    if (toggles.purgeCss === true) cssOver.purge = true
    if (toggles.safeClassNames === true) cssOver.safe = true
    if (toggles.shorthandCss === true) cssOver.shorthand = true
    if (toggles.sixHex === true) cssOver.sixHex = true
    if (toggles.prettify === true) htmlOver.format = true
    if (toggles.minify === true) htmlOver.minify = true
    if (toggles.entities === true) htmlOver.decodeEntities = true

    if (Object.keys(cssOver).length || Object.keys(htmlOver).length) {
      effective = {
        ...config,
        css: { ...config.css, ...cssOver },
        html: { ...config.html, ...htmlOver },
      }
    }
  }

  // Parse once — all DOM transformers share this array
  let dom = parse(html)

  // 0. Inline <link> stylesheets
  dom = await inlineLinkDom(dom, filePath)

  // 0.5. <Tailwind> component — compile per-block scoped CSS, inject into <head>
  if (tailwindBlocks?.length) {
    dom = await tailwindComponent(dom, tailwindBlocks, effective, filePath)
  }

  // 1. Tailwind CSS — always runs first
  dom = await tailwindcss(dom, effective, filePath)

  // 2. Safe class names
  if (enabled('safeClassNames')) dom = safeClassNamesDom(dom, effective.css)

  // 3. Attribute to style
  if (enabled('attributeToStyle') && typeof effective.css?.inline === 'object' && effective.css.inline.attributeToStyle) {
    dom = attributeToStyleDom(dom, effective.css.inline.attributeToStyle)
  }

  // 4. CSS inliner (serializes/parses internally around juice)
  if (enabled('inlineCss') && effective.css?.inline) {
    const inlineOptions = typeof effective.css.inline === 'object' ? effective.css.inline : {}
    dom = inlineCssDom(dom, inlineOptions)
  }

  // 4.5. Resolve MSO placeholders (table width + td style) from inlined CSS
  dom = msoPlaceholders(dom)

  // 4.6. Resolve Column min-width placeholders from nearest sized ancestor
  dom = columnWidth(dom)

  // 5. Remove attributes
  if (enabled('removeAttributes')) {
    const removeRules = effective.html?.attributes?.remove
    dom = removeAttributesDom(dom, Array.isArray(removeRules) ? removeRules : [])
  }

  // 6. Shorthand CSS
  if (enabled('shorthandCss') && effective.css?.shorthand) {
    const shorthandOptions = typeof effective.css.shorthand === 'object' ? effective.css.shorthand : {}
    dom = shorthandCssDom(dom, shorthandOptions)
  }

  // 7. Six-digit HEX
  if (enabled('sixHex') && effective.css?.sixHex !== false) dom = sixHexDom(dom)

  // 8. Add attributes
  if (enabled('addAttributes')) dom = addAttributesDom(dom, effective.html?.attributes)

  // 9. Filters
  if (enabled('filters')) dom = filtersDom(dom, effective.filters)

  // 10. Base URL (serializes/parses internally for VML/MSO regex passes)
  if (enabled('baseURL') && effective.url?.base) dom = baseDom(dom, effective.url.base)

  // 11. URL query
  if (enabled('urlQuery') && effective.url?.query && Object.keys(effective.url.query).length > 0) {
    const { _options: queryOptions, ...queryParams } = effective.url.query as Record<string, unknown>
    dom = urlQueryDom(dom, queryParams, (queryOptions ?? {}) as import('../types/config.ts').UrlQueryOptions)
  }

  // 12. Remove unused CSS (serializes/parses internally around email-comb)
  if (enabled('purgeCss') && effective.css?.purge) {
    const purgeOptions = typeof effective.css.purge === 'object' ? effective.css.purge : {}
    dom = purgeCssDom(dom, purgeOptions)
  }

  // 13. Entities
  if (enabled('entities')) dom = entitiesDom(dom, effective.html?.decodeEntities)

  // Serialize once — remaining transformers operate on the HTML string
  const isXhtml = doctype ? /xhtml/i.test(doctype) : false
  let result = serialize(dom, { selfClosingTags: isXhtml })

  // 14. Replace strings
  if (enabled('replaceStrings')) result = replaceStrings(result, effective)

  // 15. Format — skipped when `minify` is enabled
  const minifyWillRun = enabled('minify') && !!effective.html?.minify
  if (enabled('prettify') && !minifyWillRun && effective.html?.format) {
    const formatOptions = typeof effective.html.format === 'object' ? effective.html.format : {}
    result = await format(result, formatOptions)
  }

  // 16. Minify
  if (enabled('minify') && effective.html?.minify) {
    const minifyOptions = typeof effective.html.minify === 'object' ? effective.html.minify : {}
    result = minify(result, minifyOptions)
  }

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

// Vite plugin
export { maizzle } from './plugin.ts'

// Render
export { render } from './render/index.ts'
export type { RenderResult } from './render/index.ts'
export type { Renderer, RenderedTemplate, CreateRendererOptions } from './render/createRenderer.ts'
export { createRenderer } from './render/createRenderer.ts'

// Build
export { build } from './build.ts'

// Dev server
export { serve } from './serve.ts'

// Prepare (generate .maizzle/ type definitions)
export { prepare } from './prepare.ts'
export type { PrepareOptions } from './prepare.ts'

// Config
export { defineConfig, resolveConfig } from './config/index.ts'

// Plaintext
export { createPlaintext } from './plaintext.ts'

// Composables
export { useConfig } from './composables/useConfig.ts'
export { useDoctype } from './composables/useDoctype.ts'
export { useEvent } from './composables/useEvent.ts'
export { useFont } from './composables/useFont.ts'
export { useOutlookFallback } from './composables/useOutlookFallback.ts'
export { usePlaintext } from './composables/usePlaintext.ts'
export { useTransformers } from './composables/useTransformers.ts'
export { useBaseUrl } from './composables/useBaseUrl.ts'
export { useUrlQuery } from './composables/useUrlQuery.ts'
export { useHead } from '@unhead/vue'

// Types
export type { MaizzleConfig, HtmlConfig, UrlConfig, UrlQuery, UrlQueryOptions, CssConfig, AttributesConfig, EntitiesConfig, FilterFunction, FiltersConfig, PlaintextConfig } from './types/index.ts'

// Transformers
export { inlineLink } from './transformers/inlineLink.ts'
export { urlQuery } from './transformers/urlQuery.ts'
export { base } from './transformers/base.ts'
export { entities } from './transformers/entities.ts'
export { safeClassNames } from './transformers/safeClassNames.ts'
export { attributeToStyle } from './transformers/attributeToStyle.ts'
export { inlineCss } from './transformers/inlineCss.ts'
export type { InlineCssOptions } from './transformers/inlineCss.ts'
export { shorthandCss } from './transformers/shorthandCss.ts'
export type { ShorthandCssOptions } from './transformers/shorthandCss.ts'
export { sixHex } from './transformers/sixHex.ts'
export { removeAttributes } from './transformers/removeAttributes.ts'
export type { RemoveAttributeOption, RemoveAttributeRule } from './transformers/removeAttributes.ts'
export { addAttributes } from './transformers/addAttributes.ts'
export { purgeCss } from './transformers/purgeCss.ts'
export type { PurgeCssOptions } from './transformers/purgeCss.ts'
export { filters } from './transformers/filters/index.ts'
export { replaceStrings } from './transformers/replaceStrings.ts'
export { format } from './transformers/format.ts'
export { minify } from './transformers/minify.ts'

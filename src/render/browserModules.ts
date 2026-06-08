/**
 * Module registry + auto-import scope for the in-browser SFC compiler.
 *
 * Node renders compile SFCs through Vite, where `@vitejs/plugin-vue` resolves
 * `import`s and `unplugin-auto-import` injects Vue/unhead/Maizzle composables
 * automatically. The browser compiler has no bundler at runtime, so we
 * reproduce both manually:
 *
 * - {@link moduleRegistry}: bare specifiers an SFC (or the SSR template
 *   helpers) may `import` from, mapped to the real bundled module instances.
 *   Using the real instances is critical — it keeps composable injection
 *   keys (e.g. `MaizzleConfigKey`) identical to the ones {@link ssrRender}
 *   provides, so `inject()` resolves.
 * - {@link autoImportScope}: names available without an explicit import,
 *   matching the Node auto-import preset (all of `vue`, the unhead
 *   composables, and every Maizzle composable).
 */
import * as Vue from 'vue'
import * as VueServerRenderer from 'vue/server-renderer'
import { injectHead, useHead, useSeoMeta, useHeadSafe } from '@unhead/vue'

import * as defineConfigMod from '../composables/defineConfig.ts'
import * as renderContextMod from '../composables/renderContext.ts'
import * as useBaseUrlMod from '../composables/useBaseUrl.ts'
import * as useConfigMod from '../composables/useConfig.ts'
import * as useCurrentTemplateMod from '../composables/useCurrentTemplate.ts'
import * as useDoctypeMod from '../composables/useDoctype.ts'
import * as useEventMod from '../composables/useEvent.ts'
import * as useFontMod from '../composables/useFont.ts'
import * as useOutlookFallbackMod from '../composables/useOutlookFallback.ts'
import * as useOutputPathMod from '../composables/useOutputPath.ts'
import * as usePlaintextMod from '../composables/usePlaintext.ts'
import * as usePreheaderMod from '../composables/usePreheader.ts'
import * as useTransformersMod from '../composables/useTransformers.ts'
import * as useUrlQueryMod from '../composables/useUrlQuery.ts'

const composableModules = [
  defineConfigMod,
  renderContextMod,
  useBaseUrlMod,
  useConfigMod,
  useCurrentTemplateMod,
  useDoctypeMod,
  useEventMod,
  useFontMod,
  useOutlookFallbackMod,
  useOutputPathMod,
  usePlaintextMod,
  usePreheaderMod,
  useTransformersMod,
  useUrlQueryMod,
]

const composablesNamespace: Record<string, unknown> = {}
for (const mod of composableModules) Object.assign(composablesNamespace, mod)

const unheadComposables = { injectHead, useHead, useSeoMeta, useHeadSafe }

export const moduleRegistry: Record<string, unknown> = {
  'vue': Vue,
  'vue/server-renderer': VueServerRenderer,
  '@unhead/vue': { ...unheadComposables },
  '@maizzle/framework': composablesNamespace,
}

/**
 * Names usable inside an SFC without importing them. Spreads all of `vue`
 * (superset of the Node preset — harmless, names are only emitted into the
 * eval scope when referenced), the unhead composables, and every Maizzle
 * composable.
 */
export const autoImportScope: Record<string, unknown> = {
  ...Vue,
  ...unheadComposables,
  ...composablesNamespace,
}

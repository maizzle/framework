import { defineAsyncComponent, type Component } from 'vue'
import { compileSfcToComponent } from './compileSfc.ts'
import { builtinComponentSources } from '../components/builtinSources.generated.ts'

// Modules the built-in SFCs import. Composables are mapped by their exact
// (extensionless) relative specifier; `./utils` covers the shared helpers;
// a handful of isomorphic packages cover the rest.
import * as componentsUtils from '../components/utils.ts'
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
import * as twMerge from 'tailwind-merge'
import * as uqr from 'uqr'
import * as queryString from 'query-string'
import * as isUrl from 'is-url-superb'
import * as defu from 'defu'

/**
 * Markdown + syntax-highlighting components pull heavy deps (`shiki` ~MB,
 * `markdown-exit`). They're registered as async components so those deps are
 * dynamically imported — and the component compiled — only when a template
 * actually uses one. The bundler code-splits `shiki` into a chunk fetched
 * on demand, so non-markdown renders never pay for it.
 */
const LAZY = new Set(['CodeBlock', 'CodeInline', 'Markdown', 'MarkdownLayout'])

const composablesBySpecifier: Record<string, unknown> = {
  '../composables/defineConfig': defineConfigMod,
  '../composables/renderContext': renderContextMod,
  '../composables/useBaseUrl': useBaseUrlMod,
  '../composables/useConfig': useConfigMod,
  '../composables/useCurrentTemplate': useCurrentTemplateMod,
  '../composables/useDoctype': useDoctypeMod,
  '../composables/useEvent': useEventMod,
  '../composables/useFont': useFontMod,
  '../composables/useOutlookFallback': useOutlookFallbackMod,
  '../composables/useOutputPath': useOutputPathMod,
  '../composables/usePlaintext': usePlaintextMod,
  '../composables/usePreheader': usePreheaderMod,
  '../composables/useTransformers': useTransformersMod,
  '../composables/useUrlQuery': useUrlQueryMod,
}

let cache: Promise<Record<string, Component>> | null = null

/**
 * Compile every built-in component SFC once and return a name→component map
 * for global registration. Memoized for the lifetime of the module.
 *
 * Cross-component imports (`import Column from './Column.vue'`) are satisfied
 * with stable stub objects that are filled in-place after each component
 * compiles, so identities captured during one component's compile resolve to
 * the real component by render time regardless of compile order.
 */
export function getBuiltinComponents(): Promise<Record<string, Component>> {
  if (!cache) cache = compileAll()
  return cache
}

async function compileAll(): Promise<Record<string, Component>> {
  const names = Object.keys(builtinComponentSources)
  const stubs: Record<string, Component> = {}
  for (const name of names) stubs[name] = {}

  const siblingModules: Record<string, unknown> = {}
  for (const name of names) siblingModules[`./${name}.vue`] = { default: stubs[name] }

  const modules: Record<string, unknown> = {
    ...composablesBySpecifier,
    ...siblingModules,
    './utils': componentsUtils,
    './utils.ts': componentsUtils,
    'tailwind-merge': twMerge,
    'uqr': uqr,
    'query-string': queryString,
    'is-url-superb': isUrl,
    'defu': defu,
  }

  /**
   * Lazy compile for markdown/code components: dynamically import their heavy
   * deps + compile the SFC on first use. Closes over `modules` (sibling stubs
   * are filled by render time).
   */
  async function compileLazy(name: string): Promise<Component> {
    const [shiki, markdownExit] = await Promise.all([
      import('shiki'),
      import('markdown-exit'),
    ])
    return compileSfcToComponent(builtinComponentSources[name], {
      filename: `${name}.vue`,
      modules: { ...modules, 'shiki': shiki, 'markdown-exit': markdownExit },
    })
  }

  for (const name of names) {
    if (LAZY.has(name)) {
      // Fill in-place (don't reassign) so `./Name.vue` sibling imports stay valid.
      Object.assign(stubs[name] as object, defineAsyncComponent(() => compileLazy(name)))
      continue
    }
    try {
      const compiled = await compileSfcToComponent(builtinComponentSources[name], {
        filename: `${name}.vue`,
        modules,
      })
      Object.assign(stubs[name] as object, compiled)
    }
    catch (err) {
      // A failing built-in shouldn't take down the whole renderer.
      console.warn(`[maizzle] Failed to compile built-in component <${name}> for the browser build:`, (err as Error).message)
    }
  }

  return stubs
}

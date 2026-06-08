import { dirname, relative as relPath, resolve } from 'node:path'
import { mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { isLaravel } from '../utils/detect.ts'
import { rowSourceLocation } from './plugins/rowSourceLocation.ts'
import { rawExtract } from './plugins/rawExtract.ts'
import { codeBlockExtract } from './plugins/codeBlockExtract.ts'
import { markdownExtract } from './plugins/markdownExtract.ts'
import { createServer, mergeConfig, type InlineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import Markdown from 'unplugin-vue-markdown/vite'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { unheadVueComposablesImports } from '@unhead/vue'
import { defu as merge } from 'defu'
import { glob, globSync } from 'tinyglobby'
import { ssrRender, type RenderedTemplate } from './ssrRender.ts'
import { MaizzleConfigKey } from '../composables/useConfig.ts'
import { RenderContextKey } from '../composables/renderContext.ts'
import { componentNameFromPath, type NormalizedComponentSource } from '../utils/componentSources.ts'
import { shikiToCodeBlock } from '../components/utils.ts'
import type { Component, InjectionKey } from 'vue'
import type { MaizzleConfig, MarkdownConfig } from '../types/index.ts'
import type { MarkdownExit } from 'markdown-exit'
import type { RenderContext } from '../composables/renderContext.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))

const vuePkgDir = dirname(fileURLToPath(import.meta.resolve('vue/package.json')))
const vueServerRendererPkgDir = dirname(fileURLToPath(import.meta.resolve('@vue/server-renderer/package.json')))
const unheadVuePkgDir = resolve(dirname(fileURLToPath(import.meta.resolve('@unhead/vue'))), '..')
const vueRouterPkgDir = dirname(fileURLToPath(import.meta.resolve('vue-router/package.json')))

export type { RenderedTemplate } from './ssrRender.ts'

export interface Renderer {
  render(input: string | Component, config: MaizzleConfig, opts?: { source?: string }): Promise<RenderedTemplate>
  invalidate(filePath: string): Promise<void>
  invalidateAll(): Promise<void>
  close(): Promise<void>
}

export interface CreateRendererOptions {
  /** Generate .d.ts files for auto-imports and components (default: false) */
  dts?: boolean
  /** Options passed to unplugin-vue-markdown */
  markdown?: MarkdownConfig
  /** Root directory for resolving user component dirs and .d.ts output */
  root?: string
  /**
   * Additional component sources to register for auto-import. Already
   * normalized — pass through `normalizeComponentSources()` first.
   */
  componentDirs?: NormalizedComponentSource[]
  /** User Vite config options to merge into the internal SSR server */
  vite?: InlineConfig
}

/**
 * Lightweight Vite SSR loader for rendering Vue SFC email templates.
 *
 * Uses only Vue + unplugin for component/auto-import resolution.
 * Tailwind CSS compilation is handled by the transformer pipeline.
 */
export async function createRenderer(
  options: CreateRendererOptions = {},
): Promise<Renderer> {
  const { dts = false, markdown: markdownOptionsRaw, root = process.cwd(), componentDirs = [], vite: userViteConfig } = options
  const { shikiTheme = 'github-light', ...markdownOptions } = markdownOptionsRaw ?? {}

  /**
   * Sources without an explicit prefix get registered via unplugin's `dirs`
   * (folder name auto-namespaces). Sources with an explicit `prefix` are
   * registered through a custom resolver below so we fully control naming.
   */
  const dirSources = componentDirs.filter(s => s.prefix === undefined)
  const prefixedSources = componentDirs.filter(s => s.prefix !== undefined)

  /**
   * Absolute component dirs — used to skip auto-wrapping `.md` files that
   * are imported as reusable components (vs. entry-point email templates).
   */
  const componentDirsAbs = [resolve(root, 'components'), ...componentDirs.map(s => s.path)]

  const dtsDir = isLaravel()
    ? resolve(process.cwd(), 'resources/js/types/maizzle')
    : resolve(root, '.maizzle')

  /**
   * Built-in framework components live at this path. When a user provides
   * a top-level file with the same (PascalCased) basename, drop the
   * built-in from unplugin's scan so the user's component is the only
   * candidate. This avoids the "naming conflicts" warning and the
   * alphabetical-glob ordering pitfall that decides who wins when
   * both are present in `dirs`.
   */
  const frameworkComponentsDir = resolve(__dirname, '../components')

  function topLevelBasenamesLower(dir: string): Set<string> {
    if (!existsSync(dir)) return new Set()
    const files = globSync(['*.vue', '*.md'], { cwd: dir, absolute: false })
    return new Set(files.map(f => f.replace(/\.(vue|md)$/, '').toLowerCase()))
  }

  const frameworkFiles = globSync(['*.vue', '*.md'], { cwd: frameworkComponentsDir, absolute: false })
  const frameworkByLower = new Map(
    frameworkFiles.map(f => [f.replace(/\.(vue|md)$/, '').toLowerCase(), f]),
  )

  const shadowedNames = new Set<string>()
  for (const dir of [resolve(root, 'components'), ...dirSources.map(s => s.path)]) {
    for (const lower of topLevelBasenamesLower(dir)) {
      if (frameworkByLower.has(lower)) shadowedNames.add(lower)
    }
  }

  const frameworkExcludes = [...shadowedNames]
    .map(lower => `${frameworkComponentsDir}/${frameworkByLower.get(lower)}`)

  /**
   * Pre-scanned name → absolute-path map for prefixed sources. Rebuilt
   * on file add/unlink via the watcher hook plugin further down. Drives
   * the runtime resolver and the d.ts we emit for IDE autocompletion.
   */
  const prefixedNameMap = new Map<string, string>()

  async function scanPrefixedSources(): Promise<void> {
    prefixedNameMap.clear()
    const seen = new Map<string, string>()
    for (const source of prefixedSources) {
      const files = await glob(['**/*.vue', '**/*.md'], { cwd: source.path, absolute: true })
      for (const file of files) {
        const name = componentNameFromPath({
          filePath: file,
          dirRoot: source.path,
          prefix: source.prefix,
          pathPrefix: source.pathPrefix,
        })
        const existing = seen.get(name)
        if (existing && existing !== file) {
          throw new Error(
            `[maizzle] Component name collision: "${name}" resolved from both "${existing}" and "${file}". `
            + 'Rename one of the files or split them into separate sources with distinct prefixes.',
          )
        }
        seen.set(name, file)
        prefixedNameMap.set(name, file)
      }
    }
  }

  await scanPrefixedSources()

  const prefixedResolver = (name: string) => prefixedNameMap.get(name)

  /**
   * unplugin-vue-components' own d.ts only covers components found via
   * `dirs`; its `types` option emits named-import entries which break
   * for SFC `default` exports. Write a sibling d.ts for prefixed
   * sources so editors get correct autocompletion via TypeScript
   * interface merging on `vue.GlobalComponents`.
   */
  const prefixedDtsPath = resolve(dtsDir, 'prefixed-components.d.ts')

  function writePrefixedDts(): void {
    if (!dts) return
    if (prefixedNameMap.size === 0) {
      if (existsSync(prefixedDtsPath)) rmSync(prefixedDtsPath)
      return
    }
    const dtsBase = dirname(prefixedDtsPath)
    mkdirSync(dtsBase, { recursive: true })
    const lines = Array.from(prefixedNameMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, file]) => {
        const relativePath = relPath(dtsBase, file).replace(/\\/g, '/')
        const importPath = relativePath.startsWith('.') ? relativePath : `./${relativePath}`
        return `    ${name}: typeof import('${importPath}')['default']`
      })
      .join('\n')
    writeFileSync(
      prefixedDtsPath,
      `/* eslint-disable */\n// @ts-nocheck\n// biome-ignore lint: disable\n// oxlint-disable\n// Generated by Maizzle for prefixed component sources\n\nexport {}\n\n/* prettier-ignore */\ndeclare module 'vue' {\n  export interface GlobalComponents {\n${lines}\n  }\n}\n`,
    )
  }

  writePrefixedDts()

  /**
   * Watches prefixed source dirs and rebuilds {@link prefixedNameMap} when
   * files are added/removed. Vite's watcher already covers `dirSources`
   * via unplugin-vue-components' own filesystem hooks.
   */
  const prefixedSourceWatcher: Plugin | null = prefixedSources.length > 0
    ? {
      name: 'maizzle:prefixed-component-watcher',
      configureServer(server) {
        for (const source of prefixedSources) {
          server.watcher.add(source.path)
        }
        const refresh = async (file: string) => {
          if (!prefixedSources.some(s => file.startsWith(`${s.path}/`))) return
          if (!/\.(vue|md)$/.test(file)) return
          await scanPrefixedSources()
          writePrefixedDts()
        }
        server.watcher.on('add', refresh)
        server.watcher.on('unlink', refresh)
      },
    }
    : null

  const VIRTUAL_SFC_ID = 'virtual:maizzle-sfc.vue'
  let virtualSfcSource = ''

  /**
   * Per-render source overrides keyed by absolute template path. Lets the
   * build's beforeRender event rewrite a template's source before compile
   * while keeping the real file id — so relative imports, asset URLs and
   * component resolution still resolve against the actual file location
   * (which the virtual-SFC path can't do).
   */
  const sourceOverrides = new Map<string, string>()

  /**
   * Never load the host project's vite.config.ts here. Doing so pulls
   * every host plugin (Nitro, TanStack Start, the Maizzle plugin
   * itself, …) into this isolated SSR pipeline, where they override
   * env factories, re-trigger configureServer hooks, and break
   * Vite's hot channel wiring. Users who need extra Vite plugins
   * for SSR pass them explicitly via the `vite` option.
   */
  const maizzleConfig: InlineConfig = {
    configFile: false,
    plugins: [
      rawExtract(),
      codeBlockExtract(),
      markdownExtract(),
      rowSourceLocation(),
      {
        name: 'maizzle:virtual-sfc',
        resolveId(id) {
          if (id === VIRTUAL_SFC_ID) return id
        },
        load(id) {
          if (id === VIRTUAL_SFC_ID) return virtualSfcSource
        },
      },
      {
        name: 'maizzle:source-override',
        load(id) {
          const override = sourceOverrides.get(id.split('?')[0])
          if (override !== undefined) return override
        },
      },
      vue({
        include: [/\.vue$/, /\.md$/],
        template: {
          transformAssetUrls: false,
          compilerOptions: {
            /**
             * AMP4Email tags (<amp-carousel>, <amp-img>, <amp-list> ...)
             * render verbatim — skip the component resolver. Users who
             * want to wrap an amp tag in a Vue component should register
             * it under a PascalCase name (e.g. `components/AmpCarousel.vue`
             * → `<AmpCarousel>`).
             */
            isCustomElement: (tag: string) => tag.startsWith('amp-'),
          },
        },
      }),
      Markdown(merge(markdownOptions ?? {}, {
        headEnabled: true,
        wrapperDiv: false,
        wrapperClasses: 'prose',
        wrapperComponent: (id: string, raw: string) => {
          const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1]
          const layout = fm?.match(/^[ \t]*layout[ \t]*:[ \t]*['"]?([A-Za-z][\w-]*|false|none)['"]?[ \t]*$/m)?.[1]
          if (layout === 'false' || layout === 'none') return null
          if (layout) return layout
          /**
           * No `layout:` set — default to the built-in `MarkdownLayout`
           * for entry-template `.md` files. Skip for `.md` files inside
           * component dirs, which are reusable fragments imported into
           * other templates.
           */
          const inComponentDir = componentDirsAbs.some(d => id === d || id.startsWith(`${d}/`))
          return inComponentDir ? null : 'MarkdownLayout'
        },
        markdownOptions: {
          async highlight(code: string, lang: string) {
            const { codeToHtml } = await import('shiki')
            return codeToHtml(code, { lang, theme: shikiTheme })
          },
        },
        markdownSetup(md: MarkdownExit) {
          const defaultFence = md.renderer.rules.fence!
          md.renderer.rules.fence = (...args) =>
            Promise.resolve(defaultFence(...args)).then(shikiToCodeBlock)

          const defaultCodeBlock = md.renderer.rules.code_block!
          md.renderer.rules.code_block = (...args) => shikiToCodeBlock(defaultCodeBlock(...args) as string)
        },
      })),
      AutoImport({
        dirs: [
          resolve(__dirname, '../composables'),
          resolve(__dirname, '../filters'),
        ],
        imports: ['vue', unheadVueComposablesImports],
        /**
         * unplugin-auto-import's default `include` doesn't match `.md`, so
         * auto-imports (Vue, unhead and Maizzle composables/filters) were
         * never injected into Markdown templates — `useConfig()` and friends
         * threw at runtime. Extend the default list with `.md` (and its
         * `?vue` script sub-requests) to mirror the `.md` coverage the
         * Components plugin already declares below.
         */
        include: [/\.[jt]sx?$/, /\.vue$/, /\.vue\?vue/, /\.md$/, /\.md\?vue/],
        dts: dts ? resolve(dtsDir, 'auto-imports.d.ts') : false,
      }),
      Components({
        extensions: ['vue', 'md'],
        include: [/\.vue$/, /\.vue\?vue/, /\.md$/],
        dirs: [
          frameworkComponentsDir,
          resolve(root, 'components'),
          ...dirSources.map(s => s.path),
        ],
        /**
         * Drop built-in component files whose name the user has shadowed.
         * This makes the user's version the only match — no "naming
         * conflicts" warning, no glob-ordering games.
         */
        globsExclude: frameworkExcludes,
        directoryAsNamespace: true,
        collapseSamePrefixes: true,
        resolvers: prefixedSources.length > 0 ? [prefixedResolver] : undefined,
        dts: dts ? resolve(dtsDir, 'components.d.ts') : false,
      }),
      ...(prefixedSourceWatcher ? [prefixedSourceWatcher] : []),
    ],
    resolve: {
      alias: {
        'vue/server-renderer': resolve(vueServerRendererPkgDir, 'dist/server-renderer.esm-bundler.js'),
        'vue': resolve(vuePkgDir, 'dist/vue.runtime.esm-bundler.js'),
        'vue-router': vueRouterPkgDir,
        '@unhead/vue/server': resolve(unheadVuePkgDir, 'dist/server.mjs'),
        '@unhead/vue': resolve(unheadVuePkgDir, 'dist/index.mjs'),
      },
    },
    server: {
      middlewareMode: true,
      hmr: false,
      /**
       * Watcher is required so unplugin-vue-components and unplugin-auto-import
       * detect added/removed component files and rewrite their .d.ts on the fly.
       * (We only render via SSR — HMR is off, but chokidar still drives plugins.)
       */
      fs: {
        allow: [process.cwd(), root, ...componentDirs.map(s => s.path), vuePkgDir, vueServerRendererPkgDir, unheadVuePkgDir, vueRouterPkgDir],
      },
    },
    appType: 'custom',
    logLevel: 'silent',
    optimizeDeps: {
      noDiscovery: true,
    },
  }

  /**
   * Merge user's vite config (from config.vite) under Maizzle's config.
   * mergeConfig(a, b) → b overrides a for scalars, arrays concatenate.
   * This ensures Maizzle's critical settings (middlewareMode, appType,
   * etc.) always win, while user plugins and other options remain.
   */
  const finalConfig = userViteConfig
    ? mergeConfig(userViteConfig, maizzleConfig)
    : maizzleConfig

  const server = await createServer(finalConfig)

  return {
    async render(input: string | Component, config: MaizzleConfig, opts?: { source?: string }): Promise<RenderedTemplate> {
      let component: Component
      let configKey: InjectionKey<MaizzleConfig>
      let contextKey: InjectionKey<RenderContext>

      if (typeof input === 'string') {
        /**
         * String input goes through Vite — must use ssrLoadModule for
         * injection keys so they share the same module instance as SFC.
         */
        const configModule = await server.ssrLoadModule(resolve(__dirname, '../composables/useConfig'))
        const contextModule = await server.ssrLoadModule(resolve(__dirname, '../composables/renderContext'))
        configKey = configModule.MaizzleConfigKey
        contextKey = contextModule.RenderContextKey

        if (input.includes('<template') || input.includes('<script')) {
          virtualSfcSource = input
          const mod = server.moduleGraph.getModuleById(VIRTUAL_SFC_ID)
          if (mod) server.moduleGraph.invalidateModule(mod)
          component = (await server.ssrLoadModule(VIRTUAL_SFC_ID)).default
        } else {
          /**
           * A beforeRender handler may have rewritten the source. Register it
           * under the real path id and invalidate so ssrLoadModule compiles
           * the override; clear + invalidate afterwards so the override never
           * leaks into a later render of the same path.
           */
          const hasOverride = opts?.source !== undefined
          if (hasOverride) {
            sourceOverrides.set(input, opts!.source!)
            const mod = await server.moduleGraph.getModuleByUrl(input)
            if (mod) server.moduleGraph.invalidateModule(mod)
          }
          try {
            component = (await server.ssrLoadModule(input)).default
          } finally {
            if (hasOverride) {
              sourceOverrides.delete(input)
              const mod = await server.moduleGraph.getModuleByUrl(input)
              if (mod) server.moduleGraph.invalidateModule(mod)
            }
          }
        }
      } else {
        // Pre-compiled component — use directly imported keys
        component = input
        configKey = MaizzleConfigKey
        contextKey = RenderContextKey
      }

      return ssrRender(component, config, { configKey, contextKey })
    },

    async invalidate(filePath: string): Promise<void> {
      const mod = await server.moduleGraph.getModuleByUrl(filePath)
      if (mod) {
        server.moduleGraph.invalidateModule(mod)
      }
    },

    async invalidateAll(): Promise<void> {
      for (const mod of server.moduleGraph.idToModuleMap.values()) {
        server.moduleGraph.invalidateModule(mod)
      }
    },

    async close(): Promise<void> {
      await server.close()
      /**
       * unplugin-auto-import schedules a 500ms-throttled, fire-and-forget
       * d.ts write on its first scan. server.close() doesn't drain that
       * pending write, so callers tearing down the working dir right
       * after close (tests, ephemeral build pipelines) can race the
       * mkdir against a missing parent directory. Wait one throttle
       * window past close so the lingering write resolves while
       * the dir still exists.
       */
      if (dts) {
        await new Promise(resolve => setTimeout(resolve, 600))
      }
    },
  }
}

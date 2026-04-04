import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import vue from '@vitejs/plugin-vue'
import Markdown from 'unplugin-vue-markdown/vite'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { unheadVueComposablesImports } from '@unhead/vue'
import { defu as merge } from 'defu'
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createHead, renderSSRHead } from '@unhead/vue/server'
import { MaizzleConfigKey } from '../composables/useConfig.ts'
import { RenderContextKey } from '../composables/renderContext.ts'
import type { Component, InjectionKey } from 'vue'
import type { MaizzleConfig } from '../types/index.ts'
import type { Options as MarkdownOptions } from 'unplugin-vue-markdown/types'
import type { RenderContext } from '../composables/renderContext.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))

const vuePkgDir = dirname(fileURLToPath(import.meta.resolve('vue/package.json')))
const vueServerRendererPkgDir = dirname(fileURLToPath(import.meta.resolve('@vue/server-renderer/package.json')))
const unheadVuePkgDir = resolve(dirname(fileURLToPath(import.meta.resolve('@unhead/vue'))), '..')
const vueRouterPkgDir = dirname(fileURLToPath(import.meta.resolve('vue-router/package.json')))

export interface RenderedTemplate {
  html: string
  doctype?: string
  templateConfig: MaizzleConfig
  sfcEventHandlers: RenderContext['sfcEventHandlers']
  plaintext?: RenderContext['plaintext']
}

export interface Renderer {
  render(input: string | Component, config: MaizzleConfig): Promise<RenderedTemplate>
  invalidate(filePath: string): Promise<void>
  close(): Promise<void>
}

export interface CreateRendererOptions {
  /** Generate .d.ts files for auto-imports and components (default: false) */
  dts?: boolean
  /** Options passed to unplugin-vue-markdown */
  markdown?: MarkdownOptions
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
  const { dts = false, markdown: markdownOptions } = options

  const VIRTUAL_SFC_ID = 'virtual:maizzle-sfc.vue'
  let virtualSfcSource = ''

  const server = await createServer({
    configFile: false,
    plugins: [
      {
        name: 'maizzle:virtual-sfc',
        resolveId(id) {
          if (id === VIRTUAL_SFC_ID) return id
        },
        load(id) {
          if (id === VIRTUAL_SFC_ID) return virtualSfcSource
        },
      },
      vue({
        include: [/\.vue$/, /\.md$/],
        template: {
          transformAssetUrls: false,
        },
      }),
      Markdown(merge(markdownOptions ?? {}, {
        headEnabled: true,
        wrapperDiv: false,
      })),
      AutoImport({
        dirs: [
          resolve(__dirname, '../composables'),
          resolve(__dirname, '../filters'),
        ],
        imports: ['vue', unheadVueComposablesImports],
        dts: dts ? resolve('.maizzle/auto-imports.d.ts') : false,
      }),
      Components({
        extensions: ['vue', 'md'],
        include: [/\.vue$/, /\.vue\?vue/, /\.md$/],
        dirs: [
          resolve(__dirname, '../components'),
          'components',
        ],
        dts: dts ? resolve('.maizzle/components.d.ts') : false,
      }),
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
      watch: null,
      fs: {
        allow: [process.cwd(), vuePkgDir, vueServerRendererPkgDir, unheadVuePkgDir, vueRouterPkgDir],
      },
    },
    appType: 'custom',
    logLevel: 'silent',
    optimizeDeps: {
      noDiscovery: true,
    },
  })

  return {
    async render(input: string | Component, config: MaizzleConfig): Promise<RenderedTemplate> {
      let component: Component
      let configKey: InjectionKey<MaizzleConfig>
      let contextKey: InjectionKey<RenderContext>

      if (typeof input === 'string') {
        // String input goes through Vite — must use ssrLoadModule for injection keys
        // so they share the same module instance as the SFC
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
          component = (await server.ssrLoadModule(input)).default
        }
      } else {
        // Pre-compiled component — use directly imported keys
        component = input
        configKey = MaizzleConfigKey
        contextKey = RenderContextKey
      }

      const renderContext: RenderContext = {
        doctype: undefined,
        sfcConfig: undefined,
        sfcEventHandlers: [],
      }

      const head = createHead({ disableDefaults: true })
      const app = createSSRApp(component)
      app.use(head)
      app.provide(configKey, config)
      app.provide(contextKey, renderContext)

      let html: string = await renderToString(app)

      const { headTags, bodyTags, bodyTagsOpen, htmlAttrs, bodyAttrs } = await renderSSRHead(head)

      // Inject head entries into the rendered HTML
      if (htmlAttrs) {
        html = html.replace(/<html([^>]*)>/, `<html$1 ${htmlAttrs}>`)
      }
      if (headTags) {
        html = html.replace('</head>', `${headTags}\n</head>`)
      }
      if (bodyAttrs) {
        html = html.replace(/<body([^>]*)>/, `<body$1 ${bodyAttrs}>`)
      }
      if (bodyTagsOpen) {
        html = html.replace(/<body([^>]*)>/, `<body$1>\n${bodyTagsOpen}`)
      }
      if (bodyTags) {
        html = html.replace('</body>', `${bodyTags}\n</body>`)
      }

      return {
        html,
        doctype: renderContext.doctype,
        templateConfig: renderContext.sfcConfig ?? config,
        sfcEventHandlers: renderContext.sfcEventHandlers,
        plaintext: renderContext.plaintext,
      }
    },

    async invalidate(filePath: string): Promise<void> {
      const mod = await server.moduleGraph.getModuleByUrl(filePath)
      if (mod) {
        server.moduleGraph.invalidateModule(mod)
      }
    },

    async close(): Promise<void> {
      await server.close()
    },
  }
}

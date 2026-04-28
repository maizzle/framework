import { dirname, resolve } from 'node:path'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { isLaravel } from '../utils/detect.ts'
import { rowSourceLocation } from './plugins/rowSourceLocation.ts'
import { rawExtract } from './plugins/rawExtract.ts'
import { codeBlockExtract } from './plugins/codeBlockExtract.ts'
import { markdownExtract } from './plugins/markdownExtract.ts'
import { createServer, mergeConfig, type InlineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import Markdown from 'unplugin-vue-markdown/vite'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { unheadVueComposablesImports } from '@unhead/vue'
import { defu as merge } from 'defu'
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createHead } from '@unhead/vue/server'
import { MaizzleConfigKey } from '../composables/useConfig.ts'
import { RenderContextKey } from '../composables/renderContext.ts'
import type { Component, InjectionKey } from 'vue'
import type { MaizzleConfig, MarkdownConfig } from '../types/index.ts'
import type { MarkdownExit } from 'markdown-exit'
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
  /** Additional component directories to register for auto-import */
  componentDirs?: string[]
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

  const dtsDir = isLaravel()
    ? resolve(process.cwd(), 'resources/js/types/maizzle')
    : resolve(root, '.maizzle')

  const VIRTUAL_SFC_ID = 'virtual:maizzle-sfc.vue'
  let virtualSfcSource = ''

  // Check for a user vite.config file in the project root
  const viteConfigFile = ['vite.config.ts', 'vite.config.js']
    .map(f => resolve(root, f))
    .find(f => existsSync(f))

  const maizzleConfig: InlineConfig = {
    configFile: viteConfigFile ?? false,
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
      vue({
        include: [/\.vue$/, /\.md$/],
        template: {
          transformAssetUrls: false,
        },
      }),
      Markdown(merge(markdownOptions ?? {}, {
        headEnabled: true,
        wrapperDiv: false,
        wrapperClasses: 'prose',
        markdownOptions: {
          async highlight(code: string, lang: string) {
            const { codeToHtml } = await import('shiki')
            return codeToHtml(code, { lang, theme: shikiTheme })
          },
        },
        markdownSetup(md: MarkdownExit) {
          const wrapPre = (html: string) =>
            `<table class="w-full"><tr><td class="max-w-0 mso-padding-alt-4">${html}</td></tr></table>\n`

          const defaultFence = md.renderer.rules.fence!
          md.renderer.rules.fence = (...args) => {
            const result = defaultFence(...args)
            if (typeof result === 'string') return wrapPre(result)
            return result.then(wrapPre)
          }

          const defaultCodeBlock = md.renderer.rules.code_block!
          md.renderer.rules.code_block = (...args) => wrapPre(defaultCodeBlock(...args) as string)
        },
      })),
      AutoImport({
        dirs: [
          resolve(__dirname, '../composables'),
          resolve(__dirname, '../filters'),
        ],
        imports: ['vue', unheadVueComposablesImports],
        dts: dts ? resolve(dtsDir, 'auto-imports.d.ts') : false,
      }),
      Components({
        extensions: ['vue', 'md'],
        include: [/\.vue$/, /\.vue\?vue/, /\.md$/],
        dirs: [
          resolve(__dirname, '../components'),
          resolve(root, 'components'),
          ...componentDirs,
        ],
        dts: dts ? resolve(dtsDir, 'components.d.ts') : false,
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
      // Watcher is required so unplugin-vue-components and unplugin-auto-import
      // detect added/removed component files and rewrite their .d.ts on the fly.
      // (We only render via SSR — HMR is off, but chokidar still drives the plugins.)
      fs: {
        allow: [process.cwd(), root, ...componentDirs, vuePkgDir, vueServerRendererPkgDir, unheadVuePkgDir, vueRouterPkgDir],
      },
    },
    appType: 'custom',
    logLevel: 'silent',
    optimizeDeps: {
      noDiscovery: true,
    },
  }

  // Merge user's vite config (from config.vite) under Maizzle's config.
  // mergeConfig(a, b) → b overrides a for scalars, arrays are concatenated.
  // This ensures Maizzle's critical settings (middlewareMode, appType, etc.) always win,
  // while user plugins and other options are included.
  const finalConfig = userViteConfig && !viteConfigFile
    ? mergeConfig(userViteConfig, maizzleConfig)
    : maizzleConfig

  const server = await createServer(finalConfig)

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

      // Register user Vue plugins, directives, and global properties
      if (config.vue) {
        for (const plugin of config.vue.plugins ?? []) {
          app.use(plugin)
        }
        for (const [name, directive] of Object.entries(config.vue.directives ?? {})) {
          app.directive(name, directive)
        }
        Object.assign(app.config.globalProperties, config.vue.globalProperties)
      }

      app.provide(configKey, config)
      app.provide(contextKey, renderContext)

      const ssrContext: Record<string, any> = {}
      let html: string = await renderToString(app, ssrContext)

      const { headTags, bodyTags, bodyTagsOpen, htmlAttrs, bodyAttrs } = head.render()

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

      // Inject SSR teleport content into their target elements
      const hasTeleports = ssrContext.teleports && Object.keys(ssrContext.teleports).length > 0
      const hasFonts = (renderContext.fonts?.length ?? 0) > 0

      if (hasTeleports || hasFonts) {
        const { parse: parseDom, serialize: serializeDom, walk } = await import('../utils/ast/index.ts')
        let dom = parseDom(html)

        if (hasTeleports) {
          for (const [rawTarget, content] of Object.entries(ssrContext.teleports) as [string, string][]) {
            if (!content) continue

            const prepend = rawTarget.endsWith(':start')
            const target = prepend ? rawTarget.slice(0, -6) : rawTarget
            const targetChildren = parseDom(content)

            walk(dom, (node) => {
              const el = node as import('domhandler').Element

              if (!el.name) return

              const matched
                = target === el.name
                || (target.startsWith('#') && el.attribs?.id === target.slice(1))
                || (target.startsWith('.') && el.attribs?.class?.split(/\s+/).includes(target.slice(1)))

              if (matched) {
                for (const child of targetChildren) {
                  child.parent = el as any
                }

                el.children = prepend
                  ? [...targetChildren, ...(el.children || [])] as any
                  : [...(el.children || []), ...targetChildren] as any
              }
            })
          }
        }

        if (hasFonts) {
          const { injectFonts } = await import('./injectFonts.ts')
          injectFonts(dom, renderContext.fonts!, parseDom, walk)
        }

        html = serializeDom(dom)
      }

      // Inject preheader text from usePreheader() composable
      if (renderContext.preheader) {
        const { text, fillerCount, shyCount } = renderContext.preheader
        const filler = '\u2007\u034F '.repeat(fillerCount)
        const shys = '\u00AD '.repeat(shyCount)
        const previewHtml = `<div style="display:none">${text}${filler}${shys}\u00A0</div>`
        html = html.replace(/<body([^>]*)>/, `<body$1>${previewHtml}`)
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

    async invalidateAll(): Promise<void> {
      for (const mod of server.moduleGraph.idToModuleMap.values()) {
        server.moduleGraph.invalidateModule(mod)
      }
    },

    async close(): Promise<void> {
      await server.close()
    },
  }
}

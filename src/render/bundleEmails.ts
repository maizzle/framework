import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdirSync, writeFileSync } from 'node:fs'
import { rolldown } from 'rolldown'
import Vue from 'unplugin-vue/rolldown'
import Markdown from 'unplugin-vue-markdown/rollup'
import AutoImport from 'unplugin-auto-import/rolldown'
import Components from 'unplugin-vue-components/rolldown'
import { unheadVueComposablesImports } from '@unhead/vue'
import { defu as merge } from 'defu'
import { glob } from 'tinyglobby'
import { componentNameFromPath, type NormalizedComponentSource } from '../utils/componentSources.ts'
import type { MaizzleConfig, MarkdownConfig } from '../types/index.ts'
import type { MarkdownExit } from 'markdown-exit'

const __dirname = dirname(fileURLToPath(import.meta.url))

const vuePkgDir = dirname(fileURLToPath(import.meta.resolve('vue/package.json')))
const vueServerRendererPkgDir = dirname(fileURLToPath(import.meta.resolve('@vue/server-renderer/package.json')))
const unheadVuePkgDir = resolve(dirname(fileURLToPath(import.meta.resolve('@unhead/vue'))), '..')

export interface BundleEmailsOptions {
  /** Absolute paths to email template files (.vue or .md) to bundle. */
  templates: string[]
  /** Project root. */
  root: string
  /** Component sources from MaizzleConfig. */
  componentDirs: NormalizedComponentSource[]
  /** Output path for the bundled JS file. */
  outFile: string
  /** Markdown config from MaizzleConfig. */
  markdown?: MarkdownConfig
}

export interface BundleManifest {
  /** Absolute path to the generated bundle JS file. */
  bundlePath: string
}

/**
 * Bundle all email SFCs into a single ESM file using Rolldown.
 *
 * The output exports:
 *   - templates: Record<absolutePath, Component>
 *   - configKey, contextKey: the injection keys used by useConfig/useEvent
 */
export async function bundleEmails(options: BundleEmailsOptions): Promise<BundleManifest> {
  const { templates, root, componentDirs, outFile, markdown: markdownOptionsRaw } = options
  const { shikiTheme = 'github-light', ...markdownOptions } = markdownOptionsRaw ?? {}

  const dirSources = componentDirs.filter(s => s.prefix === undefined)
  const prefixedSources = componentDirs.filter(s => s.prefix !== undefined)

  const frameworkComponentsDir = resolve(__dirname, '../components')

  // Absolute component dirs — used to skip auto-wrapping `.md` files that are
  // imported as reusable components (vs. entry-point email templates).
  const componentDirsAbs = [resolve(root, 'components'), ...componentDirs.map(s => s.path)]

  const prefixedNameMap = new Map<string, string>()
  for (const source of prefixedSources) {
    const files = await glob(['**/*.vue', '**/*.md'], { cwd: source.path, absolute: true })
    for (const file of files) {
      const name = componentNameFromPath({
        filePath: file,
        dirRoot: source.path,
        prefix: source.prefix,
        pathPrefix: source.pathPrefix,
      })
      prefixedNameMap.set(name, file)
    }
  }
  const prefixedResolver = (name: string) => prefixedNameMap.get(name)

  // Generate the bundle entry: imports each template + re-exports keys
  // and a templates manifest map.
  const entryLines: string[] = []
  entryLines.push(`import { MaizzleConfigKey } from ${JSON.stringify(resolve(__dirname, '../composables/useConfig'))}`)
  entryLines.push(`import { RenderContextKey } from ${JSON.stringify(resolve(__dirname, '../composables/renderContext'))}`)
  for (let i = 0; i < templates.length; i++) {
    entryLines.push(`import _${i} from ${JSON.stringify(templates[i])}`)
  }
  entryLines.push('export const configKey = MaizzleConfigKey')
  entryLines.push('export const contextKey = RenderContextKey')
  entryLines.push('export const templates = {')
  for (let i = 0; i < templates.length; i++) {
    entryLines.push(`  ${JSON.stringify(templates[i])}: _${i},`)
  }
  entryLines.push('}')

  const entrySource = entryLines.join('\n')

  mkdirSync(dirname(outFile), { recursive: true })
  const entryFile = resolve(dirname(outFile), 'bundle-entry.mjs')
  writeFileSync(entryFile, entrySource)

  const bundle = await rolldown({
    input: entryFile,
    platform: 'node',
    plugins: [
      Markdown(merge(markdownOptions, {
        headEnabled: true,
        wrapperDiv: false,
        wrapperClasses: 'prose',
        wrapperComponent: (id: string, raw: string) => {
          const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1]
          const layout = fm?.match(/^[ \t]*layout[ \t]*:[ \t]*['"]?([A-Za-z][\w-]*|false|none)['"]?[ \t]*$/m)?.[1]
          if (layout === 'false' || layout === 'none') return null
          if (layout) return layout
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
      Vue({ include: [/\.vue$/, /\.md$/], ssr: true, isProduction: true, template: { transformAssetUrls: false } }),
      AutoImport({
        dirs: [
          resolve(__dirname, '../composables'),
          resolve(__dirname, '../filters'),
        ],
        imports: ['vue', unheadVueComposablesImports],
        dts: false,
      }),
      Components({
        extensions: ['vue', 'md'],
        include: [/\.vue$/, /\.vue\?vue/, /\.md$/],
        dirs: [
          frameworkComponentsDir,
          resolve(root, 'components'),
          ...dirSources.map(s => s.path),
        ],
        directoryAsNamespace: true,
        collapseSamePrefixes: true,
        resolvers: prefixedSources.length > 0 ? [prefixedResolver] : undefined,
        dts: false,
      }),
    ],
    resolve: {
      alias: {
        'vue/server-renderer': resolve(vueServerRendererPkgDir, 'dist/server-renderer.esm-bundler.js'),
        'vue': resolve(vuePkgDir, 'dist/vue.runtime.esm-bundler.js'),
        '@unhead/vue/server': resolve(unheadVuePkgDir, 'dist/server.mjs'),
        '@unhead/vue': resolve(unheadVuePkgDir, 'dist/index.mjs'),
      },
    },
    external: [
      // Keep node built-ins external; everything else inlines.
      /^node:/,
    ],
    transform: {
      define: {
        'process.env.NODE_ENV': '"production"',
      },
    },
    checks: {
      pluginTimings: false,
    },
  })

  await bundle.write({
    file: outFile,
    format: 'esm',
    sourcemap: false,
  })
  await bundle.close()

  return { bundlePath: outFile }
}

import { readFileSync } from 'node:fs'
import { dirname, resolve, basename, parse as parsePath } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { createServer, createLogger, type ViteDevServer } from 'vite'
import { renderUnicodeCompact } from 'uqr'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { glob } from 'tinyglobby'
import { createHighlighter, type Highlighter } from 'shiki'
import { createPlaintext } from './plaintext.ts'
import { stripForHtml, stripForPlaintext } from './utils/output-markers.ts'
import { resolveConfig } from './config/index.ts'
import { runTransformers } from './transformers/index.ts'
import { createRenderer, type Renderer, type RenderedTemplate } from './render/createRenderer.ts'
import { _setCurrentTemplate } from './composables/useCurrentTemplate.ts'
import { setActiveRenderer } from './render/active.ts'
import { serveCompatibility } from './server/compatibility.ts'
import { serveLint } from './server/linter.ts'
import { sendEmail } from './server/email.ts'
import { normalizeComponentSources } from './utils/componentSources.ts'
import { createWatchedFileMatcher } from './utils/watchPaths.ts'
import type { MaizzleConfig } from './types/index.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const devUIDir = resolve(__dirname, 'server/ui')

const require = createRequire(import.meta.url)
const pkg = (name: string) => {
  const resolved = require.resolve(name).replace(/\\/g, '/')
  const marker = `node_modules/${name}`
  const idx = resolved.lastIndexOf(marker)

  return resolved.slice(0, idx + marker.length)
}

export interface ServeOptions {
  config?: Partial<MaizzleConfig> | string
  /** Override the dev server port (takes precedence over config.server.port) */
  port?: number
  /** Expose the server on the network (e.g. --host) */
  host?: boolean | string
  /** When true, suppresses the banner/URL output (used by the Vite plugin, which prints its own) */
  silent?: boolean
}

/**
 * Start the Maizzle dev server.
 *
 * Creates two things:
 * 1. A Vite dev server for the dev UI (sidebar + preview, with Vue + Tailwind for the UI itself)
 * 2. A Renderer instance for SSR rendering email templates
 *
 * Template rendering goes through the Renderer, not the Vite dev server.
 */
export async function serve(options: ServeOptions = {}) {
  const start = performance.now()

  let config = await resolveConfig(options.config)
  const port = options.port ?? config.server?.port ?? 3000

  // Create a renderer for SSR rendering email templates (with dts for dev)
  let renderer = await createRenderer({ dts: true, markdown: config.markdown, root: config.root, componentDirs: normalizeComponentSources(config.components?.source, process.cwd()), vite: config.vite })

  /**
   * Register so user-land render() calls reuse this renderer instead of
   * spinning up another Vite SSR server (which collides when the host
   * app is itself a Vite dev process — e.g. TanStack Start).
   */
  setActiveRenderer(renderer)

  const server = await createServer({
    configFile: false,
    plugins: [
      // Vue and Tailwind are only for the dev UI SPA, not for email templates
      vue(),
      tailwindcss(),
      maizzleDevPlugin(config, renderer, options.config),
    ],
    resolve: {
      dedupe: ['vue'],
      alias: [
        { find: '@', replacement: devUIDir },
        { find: 'vue', replacement: resolve(pkg('vue'), 'dist/vue.runtime.esm-bundler.js') },
        ...['vue-router', 'reka-ui', '@vueuse/core', '@vueuse/shared', '@lucide/vue', 'class-variance-authority', 'clsx', 'tailwind-merge', 'culori']
          .map(name => ({ find: name, replacement: pkg(name) })),
      ],
    },
    cacheDir: resolve(devUIDir, '.vite'),
    optimizeDeps: {
      noDiscovery: true,
      include: [
        'vue',
        'vue-router',
        '@lucide/vue',
        '@vueuse/core',
        '@vueuse/shared',
        'reka-ui',
        'class-variance-authority',
        'clsx',
        'tailwind-merge',
        'culori',
      ],
    },
    server: {
      port,
      host: options.host,
      fs: {
        allow: [process.cwd(), config.root ?? process.cwd(), devUIDir, ...['vue', 'vue-router', 'reka-ui', '@vueuse/core', '@vueuse/shared', '@lucide/vue', 'class-variance-authority', 'clsx', 'tailwind-merge', 'culori'].map(pkg)],
      },
    },
    customLogger: customLogger(),
  })

  // Store renderer ref on server for cleanup
  const originalClose = server.close.bind(server)
  server.close = async () => {
    setActiveRenderer(null)
    await renderer.close()
    return originalClose()
  }

  await server.listen()

  const startupTime = Math.round(performance.now() - start)

  if (!options.silent) {
    printBanner(server, startupTime)
  }

  // Expose startup time so the plugin can print it later
  ; (server as any)._maizzleStartupTime = startupTime

  return server
}

/**
 * Internal Vite plugin that adds Maizzle middleware and file watching to the dev UI server.
 */
function maizzleDevPlugin(
  config: MaizzleConfig,
  renderer: Renderer,
  configInput: Partial<MaizzleConfig> | string | undefined,
) {
  return {
    name: 'maizzle:dev',
    enforce: 'pre' as const,

    hotUpdate: {
      order: 'pre' as const,
      handler({ file }: { file: string }) {
        /**
         * Prevent Tailwind/Vue from triggering a full reload for email template
         * files. Maizzle handles these via custom HMR events in the
         * watcher below.
         */
        if (isTemplateFile(file)) {
          return []
        }
      },
    },

    configureServer(server: ViteDevServer) {
      // File watching
      const defaultWatchPaths = [
        'maizzle.config.js',
        'maizzle.config.ts',
        'tailwind.config.js',
        'tailwind.config.ts',
        'locales/**',
      ]

      const userWatchPaths = config.server?.watch ?? []
      const watchPaths = [...defaultWatchPaths, ...userWatchPaths]
      const isWatchedFile = createWatchedFileMatcher(watchPaths, config.root ?? process.cwd())

      for (const watchPath of watchPaths) {
        server.watcher.add(watchPath)
      }

      server.watcher.on('add', async (file) => {
        if (isTemplateFile(file)) {
          await renderer.invalidateAll()
          bumpGeneration()
          server.ws.send({ type: 'custom', event: 'maizzle:templates-changed' })
        }
      })

      server.watcher.on('unlink', async (file) => {
        if (isTemplateFile(file)) {
          await renderer.invalidateAll()
          bumpGeneration()
          server.ws.send({ type: 'custom', event: 'maizzle:templates-changed' })
        }
      })

      server.watcher.on('change', async (file) => {
        if (isWatchedFile(file)) {
          config = await resolveConfig(configInput)

          // Recreate the renderer so config changes (e.g. markdown.shikiTheme) take effect
          await renderer.close()
          renderer = await createRenderer({ dts: true, markdown: config.markdown, root: config.root, componentDirs: normalizeComponentSources(config.components?.source, process.cwd()), vite: config.vite })

          /**
           * Push UI-relevant config bits so the dev UI reacts to live edits
           * without a page reload. Uses the same shape as the initial
           * inject.
           */
          server.ws.send({ type: 'custom', event: 'maizzle:config-updated', data: buildUiConfig(config) })
        }

        /**
         * Invalidate all renderer modules so component and config changes
         * are picked up on the next render (Tailwind recompiles with
         * fresh content).
         */
        await renderer.invalidateAll()
        bumpGeneration()

        if (
          isTemplateFile(file)
          || isWatchedFile(file)
        ) {
          server.ws.send({ type: 'custom', event: 'maizzle:template-updated', data: { file } })
        }
      })

      // API middleware (before Vite's middleware)
      server.middlewares.use(async (req: any, res: any, next: any) => {
        const url = req.url || '/'

        if (url === '/__maizzle/templates') {
          return serveTemplateList(config, res)
        }

        if (url.startsWith('/__maizzle/render/')) {
          return await serveRenderedTemplate(url, config, renderer, res)
        }

        if (url.startsWith('/__maizzle/source/')) {
          return await serveHighlightedSource(url, config, renderer, res)
        }

        if (url.startsWith('/__maizzle/compatibility/')) {
          return await serveCompatibility(url, res, config, normalizeComponentSources(config.components?.source, process.cwd()))
        }

        if (url.startsWith('/__maizzle/lint/')) {
          return await serveLint(url, res, config, normalizeComponentSources(config.components?.source, process.cwd()))
        }

        if (url.startsWith('/__maizzle/vue-source/')) {
          return await serveVueSource(url, config, res)
        }

        if (url.startsWith('/__maizzle/plaintext/')) {
          return await servePlaintext(url, config, renderer, res)
        }

        if (url.startsWith('/__maizzle/stats/')) {
          return await serveStats(url, config, renderer, res)
        }

        if (url.startsWith('/__maizzle/email/') && req.method === 'POST') {
          return await serveEmailEndpoint(url, req, res, config, renderer)
        }

        if (url === '/__maizzle/email-config') {
          return serveEmailConfig(config, res)
        }

        next()
      })

      // Dev UI fallback (after Vite's middleware)
      return () => {
        server.middlewares.use(async (req: any, res: any, next: any) => {
          if (isNavigationRequest(req)) {
            return await serveDevUI(server, res, req.url || '/', config)
          }

          next()
        })
      }
    },
  }
}

function isTemplateFile(file: string): boolean {
  return (file.endsWith('.vue') || file.endsWith('.md')) && !file.includes('server/ui')
}

function isNavigationRequest(req: any): boolean {
  const accept = req.headers?.accept || ''
  return req.method === 'GET' && accept.includes('text/html')
}

/**
 * Shape exposed to the dev UI both at initial HTML load (as
 * `window.__MAIZZLE_CONFIG__`) and on the `maizzle:config-updated` HMR event.
 * Add UI-visible config bits here; consumers on both ends pick up automatically.
 */
function buildUiConfig(config: MaizzleConfig) {
  return {
    checks: config.server?.checks ?? true,
  }
}

async function serveDevUI(server: ViteDevServer, res: any, url: string, config: MaizzleConfig) {
  let indexHtml = readFileSync(resolve(devUIDir, 'index.html'), 'utf-8')

  indexHtml = indexHtml.replace('./main.ts', `/@fs/${resolve(devUIDir, 'main.ts')}`)
  indexHtml = indexHtml.replace('./favicon.svg', `/@fs/${resolve(devUIDir, 'favicon.svg')}`)

  const configScript = `<script>window.__MAIZZLE_CONFIG__ = ${JSON.stringify(buildUiConfig(config))};</script>`
  indexHtml = indexHtml.replace('</head>', `${configScript}</head>`)

  const transformed = await server.transformIndexHtml(url, indexHtml)

  res.setHeader('Content-Type', 'text/html')
  res.end(transformed)
}

async function serveTemplateList(config: MaizzleConfig, res: any) {
  const contentPatterns = config.content ?? ['emails/**/*.vue']
  const templates = await glob(contentPatterns)

  const data = templates.map(t => ({
    name: basename(t).replace(/\.(vue|md)$/, ''),
    path: t,
    href: '/' + t.replace(/\.(vue|md)$/, ''),
  }))

  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(data))
}

interface DedupedRender {
  /** Transformer output — before doctype prepend / stripForHtml / stripForPlaintext. */
  rawHtml: string
  doctype: string
  templateConfig: MaizzleConfig
  rendered: RenderedTemplate
}

/**
 * Render-result memo for the dev server. A single template save makes the
 * browser fire several endpoint requests in parallel (render, source, stats,
 * plaintext, email) that each need the same SSR render + transformer output.
 * Keying the in-flight Promise by `${generation}:${path}` collapses those into
 * one render and dedupes concurrent requests. The watcher bumps the generation
 * (and clears the cache) on every file/config change, so results never go
 * stale. Each endpoint applies its own tail step (doctype prepend, strip,
 * highlight, …) on top of `rawHtml`, keeping output byte-identical.
 */
let renderGeneration = 0
const renderCache = new Map<string, Promise<DedupedRender>>()

function bumpGeneration() {
  renderGeneration++
  renderCache.clear()
}

function getRendered(absolutePath: string, config: MaizzleConfig, renderer: Renderer): Promise<DedupedRender> {
  const key = `${renderGeneration}:${absolutePath}`
  let promise = renderCache.get(key)
  if (!promise) {
    promise = (async () => {
      _setCurrentTemplate(parsePath(absolutePath))
      try {
        const rendered = await renderer.render(absolutePath, config)
        const templateConfig = rendered.templateConfig
        const doctype = rendered.doctype ?? templateConfig.doctype ?? '<!DOCTYPE html>'
        const rawHtml = await runTransformers(rendered.html, templateConfig, absolutePath, doctype, rendered.tailwindBlocks)
        return { rawHtml, doctype, templateConfig, rendered }
      } finally {
        _setCurrentTemplate(undefined)
      }
    })()
    renderCache.set(key, promise)
  }
  return promise
}

/**
 * SSR render a .vue template using the Renderer (not the dev UI server).
 */
async function serveRenderedTemplate(url: string, config: MaizzleConfig, renderer: Renderer, res: any) {
  const templateSlug = url.replace('/__maizzle/render/', '').replace(/\?.*$/, '')

  const contentPatterns = config.content ?? ['emails/**/*.vue']
  const templates = await glob(contentPatterns)
  const match = templates.find(t => t.replace(/\.(vue|md)$/, '') === templateSlug)

  if (!match) {
    res.statusCode = 404
    res.end('Template not found')
    return
  }

  const absolutePath = resolve(match)

  try {
    const { rawHtml, doctype } = await getRendered(absolutePath, config, renderer)
    let html = rawHtml
    if (doctype) html = `${doctype}\n${html}`

    res.setHeader('Content-Type', 'text/html')
    res.end(stripForHtml(html))
  } catch (error: any) {
    res.statusCode = 500
    res.end(`<pre>${error.stack || error.message}</pre>`)
  }
}

let highlighter: Highlighter | null = null

async function getHighlighter() {
  if (!highlighter) {
    highlighter = await createHighlighter({
      themes: ['laserwave'],
      langs: ['html', 'vue'],
    })
  }
  return highlighter
}

async function serveHighlightedSource(url: string, config: MaizzleConfig, renderer: Renderer, res: any) {
  const templateSlug = url.replace('/__maizzle/source/', '').replace(/\?.*$/, '')

  const contentPatterns = config.content ?? ['emails/**/*.vue']
  const templates = await glob(contentPatterns)
  const match = templates.find(t => t.replace(/\.(vue|md)$/, '') === templateSlug)

  if (!match) {
    res.statusCode = 404
    res.end('Template not found')
    return
  }

  const absolutePath = resolve(match)

  try {
    const { rawHtml, doctype } = await getRendered(absolutePath, config, renderer)
    const html = stripForHtml(doctype ? `${doctype}\n${rawHtml}` : rawHtml)

    const hl = await getHighlighter()
    const highlighted = hl.codeToHtml(html, {
      lang: 'html',
      theme: 'laserwave',
      transformers: [{
        line(node, line) {
          node.properties['data-line'] = line
        },
      }],
    })

    res.setHeader('Content-Type', 'text/html')
    res.end(highlighted)
  } catch (error: any) {
    res.statusCode = 500
    res.end(`<pre>${error.stack || error.message}</pre>`)
  }
}

async function serveVueSource(url: string, config: MaizzleConfig, res: any) {
  const templateSlug = url.replace('/__maizzle/vue-source/', '').replace(/\?.*$/, '')

  const contentPatterns = config.content ?? ['emails/**/*.vue']
  const templates = await glob(contentPatterns)
  const match = templates.find(t => t.replace(/\.(vue|md)$/, '') === templateSlug)

  if (!match) {
    res.statusCode = 404
    res.end('Template not found')
    return
  }

  try {
    const source = readFileSync(resolve(match), 'utf-8')
    const lang = match.endsWith('.md') ? 'html' : 'vue'

    const hl = await getHighlighter()
    const highlighted = hl.codeToHtml(source, {
      lang,
      theme: 'laserwave',
      transformers: [{
        line(node, line) {
          node.properties['data-line'] = line
        },
      }],
    })

    res.setHeader('Content-Type', 'text/html')
    res.end(highlighted)
  } catch (error: any) {
    res.statusCode = 500
    res.end(`<pre>${error.stack || error.message}</pre>`)
  }
}

async function servePlaintext(url: string, config: MaizzleConfig, renderer: Renderer, res: any) {
  const templateSlug = url.replace('/__maizzle/plaintext/', '').replace(/\?.*$/, '')

  const contentPatterns = config.content ?? ['emails/**/*.vue']
  const templates = await glob(contentPatterns)
  const match = templates.find(t => t.replace(/\.(vue|md)$/, '') === templateSlug)

  if (!match) {
    res.statusCode = 404
    res.end('Template not found')
    return
  }

  const absolutePath = resolve(match)

  try {
    const { rawHtml } = await getRendered(absolutePath, config, renderer)
    const plaintext = createPlaintext(stripForPlaintext(rawHtml))

    res.setHeader('Content-Type', 'text/plain')
    res.end(plaintext)
  } catch (error: any) {
    res.statusCode = 500
    res.end(error.message)
  }
}

function humanFileSize(bytes: number, si = false, dp = 2) {
  const threshold = si ? 1000 : 1024

  if (Math.abs(bytes) < threshold) {
    return bytes + ' B'
  }

  const units = ['KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  let u = -1
  const r = 10 ** dp

  do {
    bytes /= threshold
    ++u
  } while (Math.round(Math.abs(bytes) * r) / r >= threshold && u < units.length - 1)

  return bytes.toFixed(dp) + ' ' + units[u]
}

async function serveStats(url: string, config: MaizzleConfig, renderer: Renderer, res: any) {
  const templateSlug = url.replace('/__maizzle/stats/', '').replace(/\?.*$/, '')

  const contentPatterns = config.content ?? ['emails/**/*.vue']
  const templates = await glob(contentPatterns)
  const match = templates.find(t => t.replace(/\.(vue|md)$/, '') === templateSlug)

  if (!match) {
    res.statusCode = 404
    res.end(JSON.stringify({ error: 'Template not found' }))
    return
  }

  const absolutePath = resolve(match)

  try {
    const { rawHtml } = await getRendered(absolutePath, config, renderer)
    const html = stripForHtml(rawHtml)

    const sizeBytes = Buffer.byteLength(html, 'utf-8')

    // Count images: <img> tags and CSS background images
    const imgTags = (html.match(/<img\b[^>]*>/gi) || []).length
    const bgImages = (html.match(/url\s*\([^)]+\)/gi) || []).length
    const totalImages = imgTags + bgImages

    // Count links
    const links = (html.match(/<a\b[^>]*href\s*=/gi) || []).length

    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({
      size: {
        bytes: sizeBytes,
        formatted: humanFileSize(sizeBytes),
      },
      images: totalImages,
      links,
    }))
  } catch (error: any) {
    res.statusCode = 500
    res.end(JSON.stringify({ error: error.message }))
  }
}

async function serveEmailEndpoint(url: string, req: any, res: any, config: MaizzleConfig, renderer: Renderer) {
  const templateSlug = url.replace('/__maizzle/email/', '').replace(/\?.*$/, '')

  const contentPatterns = config.content ?? ['emails/**/*.vue']
  const templates = await glob(contentPatterns)
  const match = templates.find(t => t.replace(/\.(vue|md)$/, '') === templateSlug)

  if (!match) {
    res.statusCode = 404
    res.end(JSON.stringify({ success: false, message: 'Template not found' }))
    return
  }

  let body = ''
  for await (const chunk of req) body += chunk

  let payload: { to: string[]; subject: string }

  try {
    payload = JSON.parse(body)
  } catch {
    res.statusCode = 400
    res.end(JSON.stringify({ success: false, message: 'Invalid JSON' }))
    return
  }

  if (!payload.to?.length) {
    res.statusCode = 400
    res.end(JSON.stringify({ success: false, message: 'Missing recipients' }))
    return
  }

  const absolutePath = resolve(match)

  try {
    const { rawHtml, doctype, templateConfig } = await getRendered(absolutePath, config, renderer)
    let html = doctype ? `${doctype}\n${rawHtml}` : rawHtml

    const text = createPlaintext(stripForPlaintext(html))
    html = stripForHtml(html)

    const result = await sendEmail(
      { to: payload.to, subject: payload.subject, html, text },
      config,
      templateConfig,
    )

    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(result))
  } catch (error: any) {
    res.statusCode = 500
    res.end(JSON.stringify({ success: false, message: error.message }))
  }
}

function serveEmailConfig(config: MaizzleConfig, res: any) {
  const emailConfig = config.server?.email
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify({
    to: emailConfig?.to ? (Array.isArray(emailConfig.to) ? emailConfig.to : [emailConfig.to]) : [],
    from: emailConfig?.from ?? '',
    subject: emailConfig?.subject ?? '',
    hasTransport: !!emailConfig?.transport,
  }))
}

export function printBanner(server: ViteDevServer, startupTime?: number) {
  const info = server.config.logger.info
  const time = startupTime ?? (server as any)._maizzleStartupTime

  const networkUrl = server.resolvedUrls?.network[0]
  if (networkUrl) {
    const qr = renderUnicodeCompact(networkUrl, { border: 1 })
    info('')
    info(qr.split('\n').map(line => `  ${line}`).join('\n'))
  }

  info('')
  info(`  \x1b[32m\x1b[1mMAIZZLE\x1b[0m\x1b[32m v6.0.0\x1b[0m  \x1b[2mready in\x1b[0m \x1b[1m${time}\x1b[0m ms`)
  info('')
  server.printUrls()
  info('')
}

function customLogger() {
  const logger = createLogger('info')
  const warn = logger.warn

  logger.warn = (message, options) => {
    if (typeof message === 'string' && message.includes('<tr> cannot be child of <table>')) {
      return
    }

    warn(message, options)
  }

  return logger
}

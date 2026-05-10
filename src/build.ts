import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync, rmSync } from 'node:fs'
import { resolve, dirname, basename, relative, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { availableParallelism } from 'node:os'
import { glob } from 'tinyglobby'
import ora from 'ora'
import { resolveConfig } from './config/index.ts'
import { EventManager } from './events/index.ts'
import { runTransformers } from './transformers/index.ts'
import { createRenderer } from './render/createRenderer.ts'
import { createPlaintext } from './plaintext.ts'
import { stripForHtml, stripForPlaintext } from './utils/output-markers.ts'
import { normalizeComponentSources } from './utils/componentSources.ts'
import defu from 'defu'
import type { MaizzleConfig } from './types/index.ts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const __ext = __filename.endsWith('.js') ? '.js' : '.ts'

export interface BuildResult {
  files: string[]
  config: MaizzleConfig
}

/**
 * Build all SFC email templates to HTML files.
 *
 * Creates a single Renderer instance, then loops through each template
 * calling render → transformers → write to disk.
 *
 * Pass a `Partial<MaizzleConfig>` to override config inline, or a string
 * to load config from a specific file path. Omit to load `maizzle.config`
 * from the working directory.
 */
export async function build(configInput?: Partial<MaizzleConfig> | string): Promise<BuildResult> {
  const start = Date.now()
  const spinner = ora({ text: 'Building templates...', spinner: 'circleHalves' }).start()

  const config = await resolveConfig(configInput)

  const events = new EventManager()
  events.registerConfig(config)
  await events.fireBeforeCreate({ config })

  const outputPath = resolve(config.output?.path ?? 'dist')
  const outputExtension = config.output?.extension ?? 'html'

  const contentPatterns = config.content ?? ['emails/**/*.vue']
  const contentBase = computeContentBase(contentPatterns)
  const templateFiles = await glob(contentPatterns)

  if (templateFiles.length === 0) {
    spinner.succeed('No templates found')
    return { files: [], config }
  }

  // Clear the output directory before writing fresh output
  if (existsSync(outputPath)) {
    rmSync(outputPath, { recursive: true, force: true })
  }

  if (config.experimental?.parallel) {
    return await buildParallel({ config, templateFiles, outputPath, outputExtension, contentBase, events, spinner, start })
  }

  const renderer = await createRenderer({ markdown: config.markdown, root: config.root, componentDirs: normalizeComponentSources(config.components?.source, process.cwd()), vite: config.vite })
  const outputFiles: string[] = []
  // Build-scoped SFC handlers (e.g. afterBuild) accumulate across templates
  // and fire once at the end of the build.
  const buildScopedSfcHandlers: import('./events/index.ts').SfcHandlerEntry[] = []

  try {
    for (const templatePath of templateFiles) {
      const absolutePath = resolve(templatePath)
      let template = readFileSync(absolutePath, 'utf-8')

      template = await events.fireBeforeRender({ config, template })

      const rendered = await renderer.render(absolutePath, config)

      for (const entry of rendered.sfcEventHandlers) {
        if (entry.name === 'afterBuild') buildScopedSfcHandlers.push(entry)
      }

      let html = await events.fireAfterRender({ config, template, html: rendered.html }, rendered.sfcEventHandlers)

      // Use the per-template merged config (from defineConfig() in the SFC) so that
      // template-level overrides like css.safe: false are respected by transformers.
      const templateConfig = rendered.templateConfig

      const doctype = rendered.doctype ?? templateConfig.doctype ?? '<!DOCTYPE html>'

      if (templateConfig.useTransformers !== false) {
        html = await runTransformers(html, templateConfig, absolutePath, doctype, rendered.tailwindBlocks)
      }

      html = await events.fireAfterTransform({ config, template, html }, rendered.sfcEventHandlers)
      html = `${doctype}\n${html}`

      const htmlOut = stripForHtml(html)
      const outputFilePath = resolveOutputPath(templatePath, outputPath, outputExtension, contentBase)
      mkdirSync(dirname(outputFilePath), { recursive: true })
      writeFileSync(outputFilePath, htmlOut)
      outputFiles.push(outputFilePath)

      // Generate plaintext version if configured
      const globalPlaintext = templateConfig.plaintext
      const sfcPlaintext = rendered.plaintext

      if (globalPlaintext || sfcPlaintext) {
        const globalCfg = typeof globalPlaintext === 'object' ? globalPlaintext : {}
        const stripOptions = defu(sfcPlaintext?.options, globalCfg.options)
        const plaintext = createPlaintext(stripForPlaintext(html), stripOptions)
        const ptExtension = sfcPlaintext?.extension ?? globalCfg.extension ?? 'txt'

        let ptOutputPath: string

        if (sfcPlaintext?.destination) {
          const name = basename(templatePath).replace(/\.(vue|md)$/, '')
          ptOutputPath = join(resolve(sfcPlaintext.destination), `${name}.${ptExtension}`)
        } else if (globalCfg.destination) {
          ptOutputPath = resolveOutputPath(templatePath, resolve(globalCfg.destination), ptExtension, contentBase)
        } else {
          ptOutputPath = resolveOutputPath(templatePath, outputPath, ptExtension, contentBase)
        }

        mkdirSync(dirname(ptOutputPath), { recursive: true })
        writeFileSync(ptOutputPath, plaintext)
      }
    }

    await copyStatic(config, outputPath)
    await events.fireAfterBuild({ files: outputFiles, config }, buildScopedSfcHandlers)
  } finally {
    await renderer.close()
  }

  const duration = ((Date.now() - start) / 1000).toFixed(2)
  const count = outputFiles.length
  spinner.stopAndPersist({
    symbol: '✅',
    text: `Built ${count} template${count !== 1 ? 's' : ''} in ${duration}s`,
  })

  return { files: outputFiles, config }
}

/**
 * Experimental parallel build path.
 *
 * Skips the Vite SSR server entirely:
 *   1. Rolldown bundles all SFCs into one ESM file
 *   2. Piscina pool of N workers each imports the bundle once
 *   3. Workers render + transform + write per-template, in parallel
 *
 * Limitations vs the default path:
 *   - Per-template config event handlers (beforeRender/afterRender/afterTransform)
 *     do NOT fire — functions don't cross worker thread boundaries.
 *   - SFC-registered `useEvent('afterBuild', ...)` handlers do NOT fire — they
 *     live in worker scope and can't be shipped back to main.
 */
async function buildParallel(args: {
  config: MaizzleConfig
  templateFiles: string[]
  outputPath: string
  outputExtension: string
  contentBase: string
  events: EventManager
  spinner: ReturnType<typeof ora>
  start: number
}): Promise<BuildResult> {
  const { config, templateFiles, outputPath, outputExtension, contentBase, events, spinner, start } = args
  const threads = availableParallelism()

  spinner.text = `Building ${templateFiles.length} templates (using ${threads} thread${threads !== 1 ? 's' : ''})`

  // Warn about silently dropped per-template config event handlers
  const droppedConfigHandlers: string[] = []
  for (const ev of ['beforeRender', 'afterRender', 'afterTransform'] as const) {
    if (typeof config[ev] === 'function') droppedConfigHandlers.push(ev)
  }
  if (droppedConfigHandlers.length > 0) {
    spinner.warn(`experimental.parallel: ${droppedConfigHandlers.join(', ')} handler(s) on the config will not run in parallel mode`)
    spinner.start(`Building ${templateFiles.length} templates (using ${threads} thread${threads !== 1 ? 's' : ''})`)
  }

  const { Worker } = await import('node:worker_threads')
  const { default: Piscina } = await import('piscina')

  function runBundleInWorker(opts: import('./render/bundleEmails.ts').BundleEmailsOptions): Promise<void> {
    const workerPath = resolve(__dirname, `render/bundleWorker${__ext}`)
    return new Promise((res, rej) => {
      const worker = new Worker(workerPath, { workerData: opts })
      worker.once('message', () => res())
      worker.once('error', rej)
      worker.once('exit', (code) => {
        if (code !== 0) rej(new Error(`Bundle worker exited ${code}`))
      })
    })
  }

  const absTemplates = templateFiles.map(t => resolve(t))
  const cacheDir = resolve(process.cwd(), 'node_modules/.cache/maizzle')
  const bundlePath = resolve(cacheDir, 'bundle.mjs')

  await runBundleInWorker({
    templates: absTemplates,
    root: config.root ?? process.cwd(),
    componentDirs: normalizeComponentSources(config.components?.source, process.cwd()),
    outFile: bundlePath,
    markdown: config.markdown,
  })

  // Strip non-cloneable fields (functions) from config before sending to workers
  const workerConfig = stripFunctions(config)

  const pool = new Piscina({
    filename: resolve(__dirname, `render/buildWorker${__ext}`),
    maxThreads: threads,
  })

  const outputFiles: string[] = []
  let totalDroppedAfterBuild = 0

  try {
    const results = await Promise.all(
      absTemplates.map(templatePath =>
        pool.run({
          bundlePath,
          templatePath,
          config: workerConfig,
          outputPath,
          outputExtension,
          contentBase,
        }),
      ),
    )
    for (const r of results as Array<{ outputFile: string; droppedAfterBuildHandlers: number }>) {
      outputFiles.push(r.outputFile)
      totalDroppedAfterBuild += r.droppedAfterBuildHandlers
    }
  } finally {
    await pool.destroy()
  }

  if (totalDroppedAfterBuild > 0) {
    spinner.warn(`experimental.parallel: dropped ${totalDroppedAfterBuild} SFC afterBuild handler(s) — register them via config instead`)
    spinner.start(`Building ${templateFiles.length} templates (using ${threads} thread${threads !== 1 ? 's' : ''})`)
  }

  await copyStatic(config, outputPath)
  await events.fireAfterBuild({ files: outputFiles, config })

  const duration = ((Date.now() - start) / 1000).toFixed(2)
  const count = outputFiles.length
  spinner.stopAndPersist({
    symbol: '✅',
    text: `Built ${count} template${count !== 1 ? 's' : ''} in ${duration}s (used ${threads} thread${threads !== 1 ? 's' : ''})`,
  })

  return { files: outputFiles, config }
}

function stripFunctions<T>(value: T, seen = new WeakSet()): T {
  if (typeof value === 'function') return undefined as any
  if (value === null || typeof value !== 'object') return value
  if (seen.has(value as any)) return undefined as any
  seen.add(value as any)
  if (Array.isArray(value)) {
    return value.map(v => stripFunctions(v, seen)).filter(v => v !== undefined) as any
  }
  const out: any = {}
  for (const [k, v] of Object.entries(value as any)) {
    const stripped = stripFunctions(v, seen)
    if (stripped !== undefined) out[k] = stripped
  }
  return out
}

/**
 * Extract the static (non-glob) prefix from content patterns.
 *
 * For example, `['/abs/path/emails/**\/*.vue']` → `'/abs/path/emails'`
 *
 * This is used to strip the content base from template paths
 * so the output preserves only the subdirectory structure.
 */
function computeContentBase(patterns: string[]): string {
  // Use the first non-negated pattern
  const pattern = patterns.find(p => !p.startsWith('!')) ?? patterns[0]

  // Split on first glob character (* { ? [) and take the directory part
  const staticPart = pattern.split(/[*{?[]/)[0]

  // Ensure we have a clean directory path (not a partial segment)
  return resolve(staticPart.endsWith('/') ? staticPart : dirname(staticPart))
}

function resolveOutputPath(templatePath: string, outputDir: string, extension: string, contentBase: string): string {
  const name = basename(templatePath).replace(/\.(vue|md)$/, '')
  const absTemplate = resolve(templatePath)
  const rel = relative(contentBase, dirname(absTemplate))

  return join(outputDir, rel, `${name}.${extension}`)
}

async function copyStatic(config: MaizzleConfig, outputPath: string): Promise<void> {
  const sources = config.static?.source ?? ['public/**/*.*']
  const destination = config.static?.destination ?? 'public'

  const files = await glob(sources)

  for (const file of files) {
    const destPath = join(outputPath, destination, relative(dirname(sources[0]).replace(/\*.*$/, ''), file))
    const destDir = dirname(destPath)

    if (!existsSync(destDir)) {
      mkdirSync(destDir, { recursive: true })
    }

    cpSync(file, destPath)
  }
}

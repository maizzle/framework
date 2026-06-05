import { mkdirSync, cpSync, existsSync, rmSync } from 'node:fs'
import { resolve, dirname, relative, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { availableParallelism } from 'node:os'
import { glob } from 'tinyglobby'
import ora from 'ora'
import { resolveConfig } from './config/index.ts'
import { EventManager } from './events/index.ts'
import { createRenderer } from './render/createRenderer.ts'
import { normalizeComponentSources } from './utils/componentSources.ts'
import { buildTemplate, computeContentBase } from './render/buildTemplate.ts'
import type { MaizzleConfig } from './types/index.ts'

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

  const outputFiles: string[] = []
  let droppedAfterBuild = 0

  const parallel = resolveParallel(config, templateFiles.length, configInput)

  if (parallel.enabled) {
    spinner.text = `Building ${templateFiles.length} templates across ${parallel.workers} workers...`

    const result = await runParallelBuild({
      templateFiles,
      workers: parallel.workers,
      config,
      configInput,
      outputPath,
      outputExtension,
      contentBase,
    })

    outputFiles.push(...result.files)
    droppedAfterBuild = result.sfcAfterBuildCount

    await copyStatic(config, outputPath)
    await events.fireAfterBuild({ files: outputFiles, config })
  } else {
    const renderer = await createRenderer({ markdown: config.markdown, root: config.root, componentDirs: normalizeComponentSources(config.components?.source, process.cwd()), vite: config.vite })

    try {
      for (const templatePath of templateFiles) {
        const { files } = await buildTemplate(templatePath, { config, renderer, events, outputPath, outputExtension, contentBase })
        outputFiles.push(...files)
      }

      await copyStatic(config, outputPath)
      await events.fireAfterBuild({ files: outputFiles, config })
    } finally {
      await renderer.close()
    }
  }

  if (droppedAfterBuild > 0) {
    console.warn(`[maizzle] Skipped ${droppedAfterBuild} SFC-registered afterBuild handler(s): afterBuild can't run inside a parallel build worker. Move build-completion logic to the config's afterBuild hook.`)
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
 * Default template count above which parallel build turns on. Benchmarked
 * crossover (with the worker cap below) is ~25 templates; 50 leaves margin so
 * auto-parallel only kicks in where it's a reliable win across hardware.
 * Override per project with `parallel: { threshold }`.
 */
const DEFAULT_PARALLEL_THRESHOLD = 50

/**
 * Default worker cap. Each worker runs a full Vite SSR renderer, so startup +
 * contention outweighs added parallelism past ~8 — benchmarks showed 8 beating
 * 12/16/23 at every size. Override with `parallel: { workers }`.
 */
const DEFAULT_MAX_WORKERS = 8

/**
 * Decide whether to build in parallel and with how many workers.
 *
 * `config.parallel`:
 *   - omitted → parallel when `count > 50`, min(CPU count − 1, 8) workers
 *   - `true`  → always parallel (ignores threshold), default workers
 *   - `false` → always sequential
 *   - `{ workers, threshold }` → parallel when `count > threshold` (default 50),
 *     using `workers` threads (default min(CPU count − 1, 8))
 *
 * Workers reload the config file to recover function hooks, so parallel only
 * applies to file-based configs (a path or the default cwd config) — an inline
 * config object has no file to reload and always builds sequentially.
 */
export function resolveParallel(
  config: MaizzleConfig,
  count: number,
  configInput: Partial<MaizzleConfig> | string | undefined,
): { enabled: boolean; workers: number } {
  const setting = config.parallel
  if (setting === false) return { enabled: false, workers: 0 }

  const fileBased = typeof configInput === 'string' || configInput == null
  if (!fileBased) return { enabled: false, workers: 0 }

  const cpus = availableParallelism()
  const defaultWorkers = Math.min(Math.max(1, cpus - 1), DEFAULT_MAX_WORKERS)

  let maxWorkers = defaultWorkers
  let threshold = DEFAULT_PARALLEL_THRESHOLD
  // `true` opts in regardless of count; object/omitted stay threshold-gated.
  const ignoreThreshold = setting === true

  if (typeof setting === 'object' && setting !== null) {
    if (typeof setting.workers === 'number' && setting.workers > 0) maxWorkers = Math.floor(setting.workers)
    if (typeof setting.threshold === 'number' && setting.threshold >= 0) threshold = Math.floor(setting.threshold)
  }

  if (!ignoreThreshold && count <= threshold) return { enabled: false, workers: 0 }

  const workers = Math.min(maxWorkers, count)
  return { enabled: workers >= 2 && count >= 2, workers }
}

/**
 * Run the build across worker threads. Each worker reloads the config (for its
 * function hooks), builds its batch via the same `buildTemplate` as the
 * sequential path, and returns the files it wrote. beforeCreate/afterBuild stay
 * on the main thread (handled by the caller).
 */
async function runParallelBuild(opts: {
  templateFiles: string[]
  workers: number
  config: MaizzleConfig
  configInput: Partial<MaizzleConfig> | string | undefined
  outputPath: string
  outputExtension: string
  contentBase: string
}): Promise<{ files: string[]; sfcAfterBuildCount: number }> {
  const { templateFiles, workers, config, configInput, outputPath, outputExtension, contentBase } = opts

  const { default: Tinypool } = await import('tinypool')
  const workerPath = resolve(dirname(fileURLToPath(import.meta.url)), 'render/parallel/worker.mjs')

  const configPath = typeof configInput === 'string' ? configInput : undefined
  // Serializable snapshot of the post-beforeCreate config (functions dropped).
  const configData = JSON.parse(JSON.stringify(config)) as Partial<MaizzleConfig>

  const batches = shardEvenly(templateFiles, workers)

  const pool = new Tinypool({ filename: workerPath, minThreads: batches.length, maxThreads: batches.length })

  try {
    const results = await Promise.all(
      batches.map(templatePaths => pool.run({
        templatePaths,
        configPath,
        configData,
        outputPath,
        outputExtension,
        contentBase,
      })),
    )

    return {
      files: results.flatMap(r => r.files),
      sfcAfterBuildCount: results.reduce((n, r) => n + r.sfcAfterBuildCount, 0),
    }
  } finally {
    await pool.destroy()
  }
}

/** Round-robin items into up to `buckets` non-empty groups for even balance. */
function shardEvenly<T>(items: T[], buckets: number): T[][] {
  const out: T[][] = Array.from({ length: buckets }, () => [])
  items.forEach((item, i) => out[i % buckets].push(item))
  return out.filter(b => b.length > 0)
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

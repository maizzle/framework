import { createDefu } from 'defu'
import { resolveConfig } from '../../config/index.ts'
import { createRenderer } from '../createRenderer.ts'
import { EventManager } from '../../events/index.ts'
import { normalizeComponentSources } from '../../utils/componentSources.ts'
import { buildTemplate } from '../buildTemplate.ts'
import type { MaizzleConfig } from '../../types/index.ts'

export interface BuildWorkerData {
  /** Template paths (glob-relative, as produced on the main thread) for this batch. */
  templatePaths: string[]
  /** Config file path to reload (undefined → load maizzle.config from cwd). */
  configPath?: string
  /** Serialized, post-beforeCreate config data from the main thread. */
  configData: Partial<MaizzleConfig>
  outputPath: string
  outputExtension: string
  contentBase: string
}

export interface BuildWorkerResult {
  files: string[]
  sfcAfterBuildCount: number
}

/**
 * Overlay config data with array-replace (not defu's default concat) so the
 * main thread's arrays — content globs, plugin/source lists — fully replace the
 * reloaded config's instead of duplicating every entry.
 */
const mergeConfig = createDefu((obj, key, value) => {
  if (Array.isArray(value)) {
    if (!(key in obj)) obj[key as keyof typeof obj] = value
    return true
  }
})

/**
 * Build one batch of templates in a worker thread.
 *
 * Config function hooks (beforeRender/afterRender/afterTransform) can't cross
 * the thread boundary, so the worker reloads the config module to recover them,
 * then overlays the main thread's serialized config DATA on top — so
 * beforeCreate mutations and resolved values win while the reloaded config only
 * backfills the lost functions. beforeCreate/afterBuild are owned by the main
 * thread and never run here.
 */
export async function run(data: BuildWorkerData): Promise<BuildWorkerResult> {
  const { templatePaths, configPath, configData, outputPath, outputExtension, contentBase } = data

  const reloaded = await resolveConfig(configPath)
  const config = mergeConfig(configData, reloaded) as MaizzleConfig

  const events = new EventManager()
  events.registerConfig(config)

  const renderer = await createRenderer({
    markdown: config.markdown,
    root: config.root,
    componentDirs: normalizeComponentSources(config.components?.source, process.cwd()),
    vite: config.vite,
  })

  const files: string[] = []
  let sfcAfterBuildCount = 0

  try {
    for (const templatePath of templatePaths) {
      const result = await buildTemplate(templatePath, {
        config,
        renderer,
        events,
        outputPath,
        outputExtension,
        contentBase,
      })
      files.push(...result.files)
      sfcAfterBuildCount += result.sfcAfterBuildCount
    }
  } finally {
    await renderer.close()
  }

  return { files, sfcAfterBuildCount }
}

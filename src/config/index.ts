import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { createJiti } from 'jiti'
import { fileURLToPath } from 'node:url'
import { createDefu } from 'defu'

// defu that replaces arrays: if user provides content: ['x'], it replaces the default, not appends
const merge = createDefu((obj, key, value) => {
  if (Array.isArray(obj[key])) {
    obj[key] = value
    return true
  }
})
import { defaults } from './defaults.ts'
import type { MaizzleConfig } from '../types/index.ts'

export { defineConfig } from '../composables/defineConfig.ts'
export { defaults } from './defaults.ts'

const CONFIG_FILES = [
  'maizzle.config.ts',
  'maizzle.config.js',
]

/**
 * Resolve the Maizzle config.
 *
 * Always loads from the config file on disk (maizzle.config.{ts,js}),
 * then merges the programmatic config on top, then fills in defaults.
 */
export async function resolveConfig(
  config?: Partial<MaizzleConfig> | string,
  cwd: string = process.cwd(),
): Promise<MaizzleConfig> {
  // If a string path was provided, load that specific file
  const fileConfig = await loadConfig(
    typeof config === 'string' ? config : undefined,
    cwd,
  )

  // Programmatic config (object) overrides file config, which overrides defaults
  const programmaticConfig = typeof config === 'object' && config !== null ? config : {}

  return merge(programmaticConfig, fileConfig, defaults) as MaizzleConfig
}

async function loadConfig(
  configPath?: string,
  cwd: string = process.cwd(),
): Promise<MaizzleConfig> {
  const jiti = createJiti(fileURLToPath(import.meta.url), { moduleCache: false })

  // If an explicit path was provided, use it directly
  if (configPath) {
    const absolutePath = resolve(cwd, configPath)

    if (!existsSync(absolutePath)) {
      throw new Error(`Config file not found: ${absolutePath}`)
    }

    const mod = await jiti.import(absolutePath) as any
    return mod.default ?? mod
  }

  // Otherwise scan cwd for known config file names
  for (const filename of CONFIG_FILES) {
    const filepath = resolve(cwd, filename)

    if (existsSync(filepath)) {
      const mod = await jiti.import(filepath) as any
      return mod.default ?? mod
    }
  }

  // No config file found, return empty (defaults will be applied by resolveConfig)
  return {}
}

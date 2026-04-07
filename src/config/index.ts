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

  const merged = merge(programmaticConfig, fileConfig, defaults) as MaizzleConfig

  // Check if root was explicitly provided before resolving
  const hasExplicitRoot = !!(programmaticConfig.root ?? fileConfig.root)

  // Resolve root to an absolute path (defaults to cwd)
  const root = resolve(cwd, merged.root ?? '.')
  merged.root = root

  // Resolve content patterns relative to root
  if (merged.content) {
    merged.content = merged.content.map(p => {
      // Skip already-absolute or negated patterns
      if (p.startsWith('/') || p.startsWith('!')) return p
      return resolve(root, p).replace(/\\/g, '/')
    })
  }

  // Resolve static source patterns relative to root
  if (merged.static?.source) {
    merged.static.source = merged.static.source.map(p => {
      if (p.startsWith('/') || p.startsWith('!')) return p
      return resolve(root, p).replace(/\\/g, '/')
    })
  }

  // Resolve components.source paths relative to cwd (not root),
  // since extra component dirs often live outside the root directory
  if (merged.components?.source) {
    const dirs = Array.isArray(merged.components.source)
      ? merged.components.source
      : [merged.components.source]

    merged.components.source = dirs.map(p => {
      if (p.startsWith('/')) return p
      return resolve(cwd, p)
    })
  }

  // Default css.base to root when root is explicitly set,
  // so Tailwind resolves @source from the right directory.
  // When root is not set, leave css.base undefined so Tailwind
  // uses its own default (the template file's directory).
  if (hasExplicitRoot && !merged.css?.base) {
    if (!merged.css) merged.css = {}
    merged.css.base = root
  }

  return merged
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

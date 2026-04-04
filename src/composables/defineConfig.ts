import { getCurrentInstance, inject, provide } from 'vue'
import { createDefu } from 'defu'
import { MaizzleConfigKey } from './useConfig.ts'
import { RenderContextKey } from './renderContext.ts'
import type { MaizzleConfig } from '../types/index.ts'

const merge = createDefu((obj, key, value) => {
  if (Array.isArray(obj[key])) {
    obj[key] = value
    return true
  }
})

/**
 * Define Maizzle config.
 *
 * Works in both contexts:
 * - In maizzle.config.ts: typed identity function, returns the config as-is
 * - In Vue SFC <script setup>: merges with the global config and provides
 *   the result to child components via useConfig()
 */
export function defineConfig(data: Partial<MaizzleConfig> = {}): MaizzleConfig {
  // Inside a Vue SFC — merge with global config and provide to children
  if (getCurrentInstance()) {
    const globalConfig = inject(MaizzleConfigKey, {} as MaizzleConfig)
    const merged = merge(data, globalConfig) as MaizzleConfig

    const ctx = inject(RenderContextKey)
    if (ctx) ctx.sfcConfig = merged

    provide(MaizzleConfigKey, merged)

    return merged
  }

  // Outside Vue (maizzle.config.ts) — just return the config
  return data as MaizzleConfig
}

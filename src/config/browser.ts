import { createDefu } from 'defu'
import { defaults } from './defaults.ts'
import type { MaizzleConfig } from '../types/index.ts'

// Same array-replacing merge semantics as the Node resolveConfig.
const merge = createDefu((obj, key, value) => {
  if (Array.isArray(obj[key])) {
    obj[key] = value
    return true
  }
})

/**
 * Browser/edge config resolver. Unlike the Node {@link resolveConfig}, it
 * never touches disk (no `jiti`, no `maizzle.config.{ts,js}` lookup) and
 * never resolves filesystem paths — config comes purely from the argument,
 * layered over framework defaults.
 */
export function resolveConfigBrowser(config?: Partial<MaizzleConfig>): MaizzleConfig {
  const programmatic = config && typeof config === 'object' ? config : {}
  const merged = merge(programmatic, defaults) as MaizzleConfig
  if (!merged.root) merged.root = '/'
  return merged
}

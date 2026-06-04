import { inject } from 'vue'
import type { InjectionKey } from 'vue'
import type { MaizzleConfig } from '../types/index.ts'

/**
 * Use the global symbol registry so the key is identical across every
 * module instance. In dev, `render()` (Node) and the SFC's auto-imported
 * composables can resolve to two separate instances of this module; a plain
 * `Symbol()` would differ between them, so `app.provide()` and the SFC's
 * `inject()` would miss each other and `useConfig()` would throw.
 */
export const MaizzleConfigKey: InjectionKey<MaizzleConfig> = Symbol.for('maizzle.config')

export function useConfig(): MaizzleConfig {
  const config = inject(MaizzleConfigKey)

  if (!config) {
    throw new Error('useConfig() requires the Maizzle plugin to provide config. Make sure you are using it inside a Maizzle template.')
  }

  return config
}

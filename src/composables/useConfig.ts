import { inject } from 'vue'
import type { InjectionKey } from 'vue'
import type { MaizzleConfig } from '../types/index.ts'

export const MaizzleConfigKey: InjectionKey<MaizzleConfig> = Symbol('MaizzleConfig')

export function useConfig(): MaizzleConfig {
  const config = inject(MaizzleConfigKey)

  if (!config) {
    throw new Error('useConfig() requires the Maizzle plugin to provide config. Make sure you are using it inside a Maizzle template.')
  }

  return config
}

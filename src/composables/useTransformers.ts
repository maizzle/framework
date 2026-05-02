import { getCurrentInstance, inject, provide } from 'vue'
import { MaizzleConfigKey } from './useConfig.ts'
import { RenderContextKey } from './renderContext.ts'
import type { MaizzleConfig } from '../types/index.ts'

/**
 * Toggle the transformer pipeline for the current template.
 *
 * Skips CSS inlining, purging, shorthand, etc. when called with `false`.
 * Mirrors the `useTransformers` config flag, but scoped to a single template
 * — no need to edit `maizzle.config.ts`.
 *
 * Usage in SFC <script setup>:
 * ```ts
 * useTransformers(false)
 * ```
 */
export function useTransformers(enabled: boolean = true): void {
  if (!getCurrentInstance()) return

  const ctx = inject(RenderContextKey)
  if (!ctx) return

  const globalConfig = inject(MaizzleConfigKey, {} as MaizzleConfig)
  const merged: MaizzleConfig = {
    ...(ctx.sfcConfig ?? globalConfig),
    useTransformers: enabled,
  }

  ctx.sfcConfig = merged
  provide(MaizzleConfigKey, merged)
}

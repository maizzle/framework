import { getCurrentInstance, inject, provide } from 'vue'
import { MaizzleConfigKey } from './useConfig.ts'
import { RenderContextKey } from './renderContext.ts'
import type { MaizzleConfig, TransformerToggles } from '../types/index.ts'

/**
 * Toggle the transformer pipeline for the current template.
 *
 * - `useTransformers(false)` skips the entire pipeline (CSS inlining,
 *   purging, shorthand, etc).
 * - `useTransformers(true)` (or no argument) keeps everything on.
 * - `useTransformers({ inlineCSS: false, minify: false })` runs the
 *   pipeline but skips the listed transformers.
 *
 * Mirrors the `useTransformers` config flag, scoped to a single template
 * — no need to edit `maizzle.config.ts`.
 *
 * Usage in SFC <script setup>:
 * ```ts
 * useTransformers(false)
 * useTransformers({ inlineCSS: false, minify: false })
 * ```
 */
export function useTransformers(value: boolean | TransformerToggles = true): void {
  if (!getCurrentInstance()) return

  const ctx = inject(RenderContextKey)
  if (!ctx) return

  const globalConfig = inject(MaizzleConfigKey, {} as MaizzleConfig)
  const merged: MaizzleConfig = {
    ...(ctx.sfcConfig ?? globalConfig),
    useTransformers: value,
  }

  ctx.sfcConfig = merged
  provide(MaizzleConfigKey, merged)
}

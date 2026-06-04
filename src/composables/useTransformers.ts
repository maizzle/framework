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
 * - `useTransformers({ inlineCss: false, minify: false })` runs the
 *   pipeline but skips the listed transformers.
 * - `useTransformers({ prettify: true, minify: true })` *enables*
 *   transformers that would otherwise no-op (boolean-driven ones:
 *   inlineCss, purgeCss, prettify, minify, shorthandCss, sixHex,
 *   safeSelectors, entities). Same effect as setting their config
 *   slice directly, scoped to one template.
 *
 * Data-driven transformers (filters, baseURL, urlQuery, addAttributes,
 * removeAttributes, replaceStrings, attributeToStyle) need actual
 * values in config — a bare `true` toggle for them is a no-op.
 *
 * Mirrors the `useTransformers` config flag, scoped to a single template
 * — no need to edit `maizzle.config.ts`.
 *
 * Usage in SFC <script setup>:
 * ```ts
 * useTransformers(false)
 * useTransformers({ inlineCss: false, minify: false })
 * useTransformers({ prettify: true })
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

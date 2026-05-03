import { inject } from 'vue'
import { defu as merge } from 'defu'
import { RenderContextKey } from './renderContext.ts'
import type { UrlConfig } from '../types/index.ts'

/**
 * Set the base URL for the current email template — same as
 * `config.url.base`, scoped to one SFC.
 *
 * Pass a string to prepend to all default tags/attributes, or an object
 * for fine-grained control (which tags/attributes, style tags, etc.).
 *
 * Usage in SFC <script setup>:
 * ```ts
 * useBaseUrl('https://cdn.example.com/emails/')
 * useBaseUrl({ url: 'https://cdn.example.com/', styleTag: true })
 * ```
 */
export function useBaseUrl(value: UrlConfig['base']): void {
  const ctx = inject(RenderContextKey)
  if (!ctx) return
  ctx.sfcConfig = merge({ url: { base: value } }, ctx.sfcConfig ?? {})
}

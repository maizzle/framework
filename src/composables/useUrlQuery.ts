import { inject } from 'vue'
import { defu as merge } from 'defu'
import { RenderContextKey } from './renderContext.ts'
import type { UrlQuery } from '../types/index.ts'

/**
 * Append query parameters to URLs in the current email template — same
 * as `config.url.query`, scoped to one SFC. Common use: per-template
 * UTM parameters or campaign tracking.
 *
 * Usage in SFC <script setup>:
 * ```ts
 * useUrlQuery({ utm_source: 'maizzle', utm_campaign: 'newsletter' })
 * ```
 *
 * Pass `_options` alongside the params to tweak which tags/attributes
 * receive them (see `UrlQueryOptions`).
 */
export function useUrlQuery(value: UrlQuery): void {
  const ctx = inject(RenderContextKey)
  if (!ctx) return
  ctx.sfcConfig = merge({ url: { query: value } }, ctx.sfcConfig ?? {})
}

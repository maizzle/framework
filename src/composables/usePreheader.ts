import { inject } from 'vue'
import { RenderContextKey } from './renderContext.ts'

export interface UsePreheaderOptions {
  /** Number of &#8199;&#847; filler pairs to render. @default 150 */
  fillerCount?: number
  /** Number of &shy; entities to render. @default 150 */
  shyCount?: number
}

/**
 * Set the preheader text for the current email template.
 *
 * Injects a hidden `<div>` at the start of `<body>` with the preheader text
 * followed by filler characters that prevent email clients from pulling
 * in body content after the preheader.
 *
 * Usage in SFC <script setup>:
 * ```ts
 * usePreheader('Thanks for signing up!')
 * usePreheader('Welcome!', { fillerCount: 200, shyCount: 200 })
 * ```
 */
export function usePreheader(text: string, options?: UsePreheaderOptions): void {
  const ctx = inject(RenderContextKey)
  if (ctx) {
    ctx.preheader = {
      text,
      fillerCount: options?.fillerCount ?? 150,
      shyCount: options?.shyCount ?? 150,
    }
  }
}

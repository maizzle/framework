import { inject } from 'vue'
import { RenderContextKey } from './renderContext.ts'

const PREVIEW_LENGTH = 200

export interface UsePreheaderOptions {
  /**
   * Explicit number of filler sequences to render. When omitted, the count
   * is auto-derived to fill the 200-char inbox preview budget.
   */
  spaces?: number
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
 * usePreheader('Welcome!', { spaces: 50 })
 * ```
 */
export function usePreheader(text: string, options?: UsePreheaderOptions): void {
  const ctx = inject(RenderContextKey)
  if (ctx) {
    const fillerCount = options?.spaces !== undefined
      ? Math.max(0, options.spaces)
      : Math.max(0, PREVIEW_LENGTH - text.length)
    ctx.preheader = { text, fillerCount }
  }
}

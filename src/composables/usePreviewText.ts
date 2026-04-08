import { inject } from 'vue'
import { RenderContextKey } from './renderContext.ts'

export interface UsePreviewTextOptions {
  /** Number of &#8199;&#847; filler pairs to render. @default 150 */
  fillerCount?: number
  /** Number of &shy; entities to render. @default 150 */
  shyCount?: number
}

/**
 * Set the preview/preheader text for the current email template.
 *
 * Injects a hidden `<div>` at the start of `<body>` with the preview text
 * followed by filler characters that prevent email clients from pulling
 * in body content after the preheader.
 *
 * Usage in SFC <script setup>:
 * ```ts
 * usePreviewText('Thanks for signing up!')
 * usePreviewText('Welcome!', { fillerCount: 200, shyCount: 200 })
 * ```
 */
export function usePreviewText(text: string, options?: UsePreviewTextOptions): void {
  const ctx = inject(RenderContextKey)
  if (ctx) {
    ctx.previewText = {
      text,
      fillerCount: options?.fillerCount ?? 150,
      shyCount: options?.shyCount ?? 150,
    }
  }
}

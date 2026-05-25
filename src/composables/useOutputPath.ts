import { inject } from 'vue'
import { RenderContextKey } from './renderContext.ts'

/**
 * Override the output file path for the current template.
 *
 * The path is relative to the project root (cwd); it may be
 * absolute or escape the output directory with `../`. If it
 * has no extension, `output.extension` is appended.
 *
 * Usage in SFC <script setup>:
 * ```ts
 * useOutputPath('dist/promos/black-friday.html')
 * ```
 */
export function useOutputPath(path: string): void {
  const ctx = inject(RenderContextKey)
  if (ctx) ctx.outputPath = path
}

import { inject } from 'vue'
import { RenderContextKey } from './renderContext.ts'

export interface UsePlaintextOptions {
  extension?: string
  destination?: string
}

/**
 * Enable plaintext generation for the current email template.
 *
 * Usage in SFC <script setup>:
 * ```ts
 * usePlaintext()
 * usePlaintext({ extension: 'text' })
 * usePlaintext({ destination: '/custom/path' })
 * ```
 */
export function usePlaintext(options?: UsePlaintextOptions): void {
  const ctx = inject(RenderContextKey)
  if (ctx) ctx.plaintext = options ?? {}
}

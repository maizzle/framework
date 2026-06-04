import { inject } from 'vue'
import { RenderContextKey } from './renderContext.ts'

/**
 * Set the doctype for the current email template.
 *
 * Usage in SFC <script setup>:
 * ```ts
 * useDoctype('<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">')
 * ```
 */
export function useDoctype(doctype: string): void {
  const ctx = inject(RenderContextKey)
  if (ctx) ctx.doctype = doctype
}

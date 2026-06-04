import { inject } from 'vue'
import { RenderContextKey } from './renderContext.ts'
import type { EventName, EventMap } from '../events/index.ts'

/**
 * Register an event handler from within an SFC's <script setup>.
 *
 * Usage:
 * ```ts
 * useEvent('beforeRender', ({ config, template }) => {
 *   return template.source.replace('foo', 'bar')
 * })
 * ```
 */
export function useEvent<K extends EventName>(name: K, handler: EventMap[K]) {
  const ctx = inject(RenderContextKey)
  if (ctx) ctx.sfcEventHandlers.push({ name, handler })
}

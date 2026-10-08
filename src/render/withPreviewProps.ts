import { defineComponent, h, inject } from 'vue'
import type { Component } from 'vue'
import { MaizzleConfigKey } from '../composables/useConfig.ts'

/**
 * Set on a per-render config by the dev server. Global symbol registry
 * so the Node and Vite SSR module instances agree on the key.
 */
export const PreviewPropsKey = Symbol.for('maizzle.previewProps')

/**
 * Wrap a template that calls `definePreviewProps()`. Passes the real props
 * through untouched, and only in dev server renders merges the sample
 * props underneath them. The factory is never called otherwise.
 */
export function withPreviewProps(
  component: Component,
  previewProps: () => Record<string, any> | Promise<Record<string, any>>,
): Component {
  return defineComponent({
    name: (component as { __name?: string }).__name,
    inheritAttrs: false,
    setup(_, { attrs, slots }) {
      const config = inject(MaizzleConfigKey) as Record<symbol, unknown> | undefined
      if (!config?.[PreviewPropsKey]) return () => h(component, attrs, slots)

      const withPreview = (preview: Record<string, any>) => {
        const props = { ...preview, ...attrs }
        return () => h(component, props, slots)
      }

      /**
       * The factory is async when the sample data comes from imports,
       * which it loads itself. Vue's SSR renderer awaits an async
       * setup(), so those modules only load in the dev server.
       */
      const preview = previewProps()
      return preview instanceof Promise ? preview.then(withPreview) : withPreview(preview)
    },
  })
}

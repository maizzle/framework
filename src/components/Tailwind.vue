<script lang="ts">
import { defineComponent, createCommentVNode, inject, h, Fragment, type VNode } from 'vue'
import { RenderContextKey } from '../composables/renderContext'

/**
 * Walk a slot's vnode tree and concatenate its text content.
 * Handles plain text children, arrays, and Comment vnodes.
 * Static text in <template #config>...</template> compiles into
 * text vnodes whose `children` is a string — that's our path.
 */
function vnodeText(input: unknown): string {
  if (input == null || input === false) return ''
  if (typeof input === 'string') return input
  if (typeof input === 'number') return String(input)
  if (Array.isArray(input)) return input.map(vnodeText).join('')

  const v = input as VNode
  if (typeof v.children === 'string') return v.children
  if (Array.isArray(v.children)) return vnodeText(v.children)
  return ''
}

export default defineComponent({
  name: 'Tailwind',
  setup(_, { slots }) {
    const ctx = inject(RenderContextKey)!
    if (!ctx.tailwindBlocks) ctx.tailwindBlocks = []
    const id = `tw${ctx.tailwindBlocks.length}`

    /**
     * Extract optional `#config` slot content as raw CSS. Evaluated at setup
     * time; the slot is NOT rendered into the document.
     */
    const css = slots.config ? vnodeText(slots.config()).trim() : undefined

    ctx.tailwindBlocks.push({ id, css: css || undefined })

    return () => h(Fragment, null, [
      createCommentVNode(`mz-tw:${id}`),
      slots.default?.(),
      createCommentVNode(`/mz-tw:${id}`),
    ])
  },
})
</script>

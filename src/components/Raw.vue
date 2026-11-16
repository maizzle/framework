<script lang="ts">
import { createStaticVNode, inject } from 'vue'
import { RenderContextKey, renderNonce } from '../composables/renderContext'
import { rawMarker } from '../utils/raw'

export default {
  inheritAttrs: false,
  props: {
    /**
     * Raw content to emit verbatim.
     *
     * Auto-populated from slot content by
     * the `maizzle:raw-extract` Vite plugin
     * before Vue compiles the template,
     * so `{{ }}` and other Vue/ESP
     * syntax pass through untouched.
     */
    content: {
      type: String,
      default: '',
    },
  },
  setup(props) {
    if (!props.content) {
      return () => createStaticVNode('', 0)
    }

    /**
     * Inside a Maizzle render, emit a marker and stash the content
     * on the render context. Transformers only ever see the
     * marker, so the content can't be re-encoded or
     * restructured. It's restored at the very end.
     */
    const ctx = inject(RenderContextKey, null)

    if (!ctx) {
      return () => createStaticVNode(props.content, 1)
    }

    ctx.raw ??= { nonce: renderNonce(ctx), blocks: [] }

    const marker = rawMarker(ctx.raw.nonce, ctx.raw.blocks.length)
    ctx.raw.blocks.push(props.content)

    return () => createStaticVNode(marker, 1)
  },
}
</script>

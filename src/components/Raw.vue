<script lang="ts">
import { createStaticVNode } from 'vue'

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
    return () => createStaticVNode(props.content, 1)
  },
}
</script>

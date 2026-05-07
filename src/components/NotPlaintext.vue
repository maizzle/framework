<script lang="ts">
import { h } from 'vue'

export default {
  name: 'NotPlaintext',
  setup(_, { slots }) {
    return () => h(
      'div',
      { 'data-maizzle-html-only': '' },
      slots.default?.(),
    )
  },
}
</script>

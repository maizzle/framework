<script lang="ts">
import { h } from 'vue'

export default {
  name: 'Plaintext',
  setup(_, { slots }) {
    return () => h(
      'div',
      { 'data-maizzle-plaintext-only': '' },
      slots.default?.(),
    )
  },
}
</script>

<script lang="ts">
import { inject } from 'vue'
import { RenderContextKey } from '../composables/renderContext'
import { outputMarkers } from '../utils/output-markers'

export default {
  name: 'Plaintext',
  setup(_, { slots }) {
    const ctx = inject(RenderContextKey, null)

    // Outside a Maizzle render there is no plaintext output
    if (!ctx) return () => null

    const [start, end] = outputMarkers(ctx, 'PT')

    return () => [start, slots.default?.(), end]
  },
}
</script>

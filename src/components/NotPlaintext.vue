<script lang="ts">
import { inject } from 'vue'
import { RenderContextKey } from '../composables/renderContext'
import { outputMarkers } from '../utils/output-markers'

export default {
  name: 'NotPlaintext',
  setup(_, { slots }) {
    const ctx = inject(RenderContextKey, null)

    if (!ctx) return () => slots.default?.()

    const [start, end] = outputMarkers(ctx, 'HO')

    return () => [start, slots.default?.(), end]
  },
}
</script>

import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'happy-dom',
    /**
     * Reuse the worker's module graph across test files. Halves the
     * suite's summed import cost. Drop back to `true` if a future
     * test starts mutating cross-file shared module state.
     */
    isolate: false,
  },
})

import { defineConfig, coverageConfigDefaults } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'happy-dom',
    coverage: {
      exclude: [
        ...coverageConfigDefaults.exclude,
        // Dev-server surfaces: the SSR bootstrap and the dev-UI/middleware
        // (rendering, linting, compatibility checks, email sending). These are
        // exercised by the running dev server, not unit tests, so they're
        // excluded to keep the coverage number meaningful for the library core.
        'src/serve.ts',
        'src/server/**',
      ],
    },
  },
})

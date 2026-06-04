import { defineConfig } from 'tsdown'
import { cpSync } from 'node:fs'

export default defineConfig({
  entry: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/server/ui/**',
    '!src/types/modules.d.ts',
  ],
  format: 'esm',
  dts: true,
  unbundle: true,
  outExtensions: () => ({ js: '.js', dts: '.d.ts' }),
  external: ['lightningcss'],
  outDir: 'dist',
  clean: true,
  hooks: {
    'build:done': () => {
      // Copy Vue components (resolved at runtime by unplugin-vue-components)
      cpSync('src/components', 'dist/components', { recursive: true })
      // Copy dev UI (served at runtime by Vite)
      cpSync('src/server/ui', 'dist/server/ui', { recursive: true })
    },
  },
})

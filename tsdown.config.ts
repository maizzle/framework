import { defineConfig } from 'tsdown'
import { cpSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = dirname(fileURLToPath(import.meta.url))
const browserStub = resolve(root, 'src/render/browserStubs.ts')

// --- Node build: unbundled, mirrors src/ structure into dist/ ---------------
const nodeBuild = defineConfig({
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
      // Copy the parallel-build worker entry (plain JS, loaded by tinypool at runtime)
      cpSync('src/render/parallel/worker.mjs', 'dist/render/parallel/worker.mjs')
    },
  },
})

// --- Browser/edge build: single bundled, self-contained entry ---------------
const browserBuild = defineConfig({
  entry: { browser: 'src/render/browser.ts' },
  format: 'esm',
  dts: true,
  unbundle: false,
  platform: 'browser',
  outDir: 'dist',
  clean: false, // runs after nodeBuild — don't wipe its output
  // Bundle only our own src; externalize every third-party/bare specifier so
  // the consumer's bundler resolves them with browser conditions (and handles
  // wasm assets for lightningcss-wasm, the browser build of @vue/compiler-sfc,
  // etc.). Relative/absolute ids (our code + the stub alias) stay bundled.
  // Match bare specifiers (not relative/absolute), but NOT `node:*` — external
  // is resolved before alias, so `node:path` must fall through to the `pathe`
  // alias below; any other `node:` builtin reaching here is a real leak.
  external: [/^(?!node:)[^./]/],
  alias: {
    // Browser-safe path utils.
    'node:path': 'pathe',
    // Node-only transformer fallbacks → throwing stubs (never executed; the
    // browser renderer injects real implementations).
    [resolve(root, 'src/utils/compileTailwindCss.ts')]: browserStub,
    [resolve(root, 'src/transformers/format.ts')]: browserStub,
    [resolve(root, 'src/transformers/inlineLink.node.ts')]: browserStub,
  },
})

export default [nodeBuild, browserBuild]

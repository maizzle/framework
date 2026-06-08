import { compile } from 'tailwindcss'
import initLightning, { transform as lightningTransform } from 'lightningcss-wasm'
import postcss from 'postcss'
import postcssCalc from 'postcss-calc'
import { dirname, join } from 'pathe'
import resolveProps from '../plugins/postcss/resolveProps.ts'
import pruneVars from '../plugins/postcss/pruneVars.ts'
import { optimizeTailwindCss } from './optimizeTailwindCss.ts'
import { tailwindCssFiles, tailwindCssAliases } from './tailwindCssSources.generated.ts'
import type { MaizzleConfig } from '../types/config.ts'

/**
 * Browser/edge Tailwind compiler — drop-in for the Node `compileTailwindCss`
 * with the same `(cssInput, config, from)` signature. Uses Tailwind v4's
 * isomorphic `compile()` core (fed bundled CSS via `loadStylesheet`, so no
 * filesystem and no `createRequire`) and lowers modern syntax with
 * `lightningcss-wasm` instead of the native binding.
 */

let lightningReady: Promise<unknown> | null = null
function ensureLightning(): Promise<unknown> {
  if (!lightningReady) lightningReady = initLightning()
  return lightningReady
}

const encoder = new TextEncoder()
const decoder = new TextDecoder()

/** Resolve a CSS `@import` against the bundled Tailwind/Maizzle sources. */
function resolveCss(id: string, base: string): { path: string; content: string; base: string } | null {
  let key: string | undefined
  if (id.startsWith('.')) {
    key = join(base || '/', id).replace(/^\/+/, '')
    if (!key.endsWith('.css')) key += '.css'
  }
  else {
    key = tailwindCssAliases[id] ?? (id.endsWith('.css') && id in tailwindCssFiles ? id : undefined)
  }
  if (key && key in tailwindCssFiles) {
    return { path: key, content: tailwindCssFiles[key], base: dirname(key) }
  }
  return null
}

/**
 * Pull class candidates out of `@source inline("…")` and strip every
 * `@source` at-rule — path-based scanning is meaningless in-browser, and
 * we feed candidates to `build()` directly instead.
 */
function extractInlineCandidates(css: string): { candidates: string[]; cleaned: string } {
  const candidates: string[] = []
  const cleaned = css.replace(/@source\s+([^;]*);/g, (_m, body: string) => {
    const inline = body.match(/inline\(\s*["']([\s\S]*?)["']\s*\)/)
    if (inline) candidates.push(...inline[1].split(/\s+/).filter(Boolean))
    return ''
  })
  return { candidates, cleaned }
}

function lowerCssSyntax(css: string): string {
  const result = lightningTransform({
    filename: 'email.css',
    code: encoder.encode(css),
    minify: false,
    targets: { ie: 4 << 5 },
  })
  return decoder.decode(result.code)
}

export async function compileTailwindCssBrowser(
  cssInput: string,
  config: MaizzleConfig,
  _from: string,
): Promise<string> {
  await ensureLightning()

  const { candidates, cleaned } = extractInlineCandidates(cssInput)

  const compiled = await compile(cleaned, {
    base: '/',
    loadStylesheet: async (id: string, base: string) => {
      const resolved = resolveCss(id, base)
      if (!resolved) {
        throw new Error(`[maizzle] Cannot resolve CSS import "${id}" (from "${base}") in the browser build.`)
      }
      return resolved
    },
    loadModule: async () => {
      throw new Error('[maizzle] JavaScript-based Tailwind config/plugins are not supported in the browser build. Use CSS-first configuration.')
    },
  })

  const built = compiled.build(candidates)

  // Same post-compilation PostCSS pass the Node path runs after Tailwind:
  // resolve `var()` to concrete values, reduce `calc()`, prune unused vars.
  // (The Node path runs these inside its `@tailwindcss/postcss` chain; the
  // browser path uses Tailwind's core `compile()`, so they're applied here.)
  // All pure-JS — no eval, safe on edge isolates.
  const processed = (await postcss([resolveProps(), postcssCalc({}), pruneVars()]).process(built, { from: undefined })).css

  const lowered = lowerCssSyntax(processed)
  return optimizeTailwindCss(lowered, config)
}

import { createRequire } from 'node:module'
import type { Plugin } from 'postcss'

const PKG = '@maizzle/tailwindcss'
const SUBPATH_RE = new RegExp(`^${PKG}(?:/|$)`)

const requireFromFramework = createRequire(import.meta.url)

/**
 * Rewrite `@import "@maizzle/tailwindcss"` (and subpaths like
 * `@maizzle/tailwindcss/mso`) to absolute file paths so postcss/Tailwind
 * can resolve them regardless of where the user's template lives or how
 * their package manager hoists dependencies.
 *
 * Resolution order: prefer the user's project copy (so explicit installs
 * win), then fall back to the copy bundled with the framework.
 */
export function resolveMaizzleImports(userRoot: string = process.cwd()): Plugin {
  const requireFromUser = createRequire(`${userRoot}/_maizzle.js`)

  function resolve(spec: string): string | undefined {
    try { return requireFromUser.resolve(spec) } catch {}
    try { return requireFromFramework.resolve(spec) } catch {}
    return undefined
  }

  return {
    postcssPlugin: 'maizzle:resolve-tw-imports',
    AtRule: {
      import(rule) {
        const m = rule.params.match(/^\s*["']([^"']+)["']/)
        if (!m) return
        const spec = m[1]
        if (!SUBPATH_RE.test(spec)) return

        const abs = resolve(spec)
        if (abs) rule.params = rule.params.replace(m[0], `"${abs}"`)
      },
    },
  }
}

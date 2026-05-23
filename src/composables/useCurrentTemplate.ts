import type { ParsedPath } from 'node:path'

// Stored on globalThis so the Vite SSR module graph (which loads this
// file when a user SFC auto-imports useCurrentTemplate) and the Node
// import graph (used by build.ts / serve.ts) share the same value.
// Two module instances would otherwise hold independent `let` bindings.
const KEY = Symbol.for('maizzle.currentTemplate')

interface GlobalWithCurrentTemplate {
  [KEY]?: ParsedPath
}

/**
 * Internal — set by the build loop before each template iteration and
 * cleared in `finally`. Not exported from the package entrypoint.
 */
export function _setCurrentTemplate(parsed: ParsedPath | undefined): void {
  (globalThis as GlobalWithCurrentTemplate)[KEY] = parsed
}

/**
 * Returns the parsed path of the template currently being processed,
 * or `undefined` when called outside the per-template scope (e.g. from
 * `beforeCreate` / `afterBuild`, or outside a build entirely).
 *
 * Usage in an SFC `<script setup>`:
 * ```ts
 * const file = useCurrentTemplate()
 * console.log(file?.name) // 'welcome'
 * ```
 *
 * Usage in an event handler:
 * ```ts
 * beforeRender() {
 *   const file = useCurrentTemplate()
 *   // file?.dir, file?.name, file?.ext, file?.base, file?.root
 * }
 * ```
 */
export function useCurrentTemplate(): ParsedPath | undefined {
  return (globalThis as GlobalWithCurrentTemplate)[KEY]
}

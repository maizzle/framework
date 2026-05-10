import type { ParsedPath } from 'node:path'

let current: ParsedPath | undefined

/**
 * Internal — set by the build loop before each template iteration and
 * cleared in `finally`. Not exported from the package entrypoint.
 */
export function _setCurrentTemplate(parsed: ParsedPath | undefined): void {
  current = parsed
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
  return current
}

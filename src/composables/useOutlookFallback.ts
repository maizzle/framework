import { inject, provide, type InjectionKey } from 'vue'

const OutlookFallbackKey: InjectionKey<boolean> = Symbol('OutlookFallback')

/**
 * Toggle whether descendants emit Outlook (MSO) and VML fallback markup.
 *
 * Call once in a Layout/template's `<script setup>` to disable for the
 * whole tree:
 *   `useOutlookFallback(false)`
 *
 * Components inheriting `false` skip MSO ghost tables, VML rectangles,
 * `xmlns:v`/`xmlns:o`, mso-specific CSS, and Button's `<Outlook>`
 * spacers. Each MSO-aware component still accepts an `outlook-fallback`
 * prop that overrides inheritance for its subtree.
 *
 * @param value Pass `true`/`false` to set; omit to just read the
 *              inherited value (defaults to `true` at the root).
 * @returns The resolved boolean for the current component.
 */
export function useOutlookFallback(value?: boolean | null): boolean {
  const inherited = inject(OutlookFallbackKey, true)
  const enabled = value == null ? inherited : value
  provide(OutlookFallbackKey, enabled)
  return enabled
}

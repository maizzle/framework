import sortMediaQueries from 'postcss-sort-media-queries'
import type postcss from 'postcss'
import type { MaizzleConfig } from '../../types/config.ts'

/**
 * Sorts and merges CSS media queries using postcss-sort-media-queries.
 *
 * Enabled by default. Opt out with css: { media: false }.
 *
 * Config examples:
 *   css: { media: true }                       // merge, mobile-first sort (default)
 *   css: { media: { sort: 'desktop-first' } }  // merge, desktop-first sort
 *   css: { media: false }                       // disabled
 */
export function mergeMediaQueries(config: MaizzleConfig): postcss.Plugin | null {
  const media = config.css?.media

  if (media === false) return null

  const options = typeof media === 'object' ? media : {}
  const sort = options.sort ?? 'mobile-first'

  return sortMediaQueries({ sort }) as postcss.Plugin
}

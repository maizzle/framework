import { crush } from 'html-crush'
import { defu as merge } from 'defu'
import type { Opts } from 'html-crush'
import type { MaizzleConfig } from '../types/config.ts'

const DEFAULT_OPTIONS = {
  removeLineBreaks: true,
}

/**
 * Minify transformer.
 *
 * Minifies HTML using the `html-crush` package.
 * Enabled by setting `minify: true` (or passing options object).
 * User options are merged on top of the defaults.
 *
 * The only Maizzle default that differs from html-crush's own defaults
 * is `removeLineBreaks: true`.
 */
export function minify(html: string, config: MaizzleConfig = {}): string {
  const option = config.html?.minify

  if (!option) return html

  const userOptions = typeof option === 'object' ? option : {}
  const options = merge(userOptions, DEFAULT_OPTIONS) as Partial<Opts>

  return crush(html, options).result
}

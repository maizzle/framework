import { crush } from 'html-crush'
import { defu as merge } from 'defu'
import type { Opts as HtmlCrushOptions } from 'html-crush'

export type { Opts as MinifyOptions } from 'html-crush'

const DEFAULT_OPTIONS: Partial<HtmlCrushOptions> = {
  removeLineBreaks: true,
}

/**
 * Minify an HTML string using `html-crush`. Maizzle's only default that
 * differs from html-crush's own defaults is `removeLineBreaks: true`.
 *
 * @param html    HTML string to minify.
 * @param options [html-crush options](https://codsen.com/os/html-crush) merged
 *                on top of the Maizzle defaults.
 * @returns       The minified HTML string.
 *
 * @example
 * import { minify } from '@maizzle/framework'
 *
 * const tight = minify('<p>  hello  </p>', { removeIndentations: true })
 */
export function minify(html: string, options: Partial<HtmlCrushOptions> = {}): string {
  const merged = merge(options, DEFAULT_OPTIONS) as Partial<HtmlCrushOptions>
  return crush(html, merged).result
}

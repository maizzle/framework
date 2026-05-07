import { format as oxfmt } from 'oxfmt'
import { defu as merge } from 'defu'
import type { FormatOptions } from 'oxfmt'

export type { FormatOptions } from 'oxfmt'

const DEFAULT_OPTIONS: FormatOptions = {
  printWidth: 320,
  htmlWhitespaceSensitivity: 'ignore',
  embeddedLanguageFormatting: 'off',
}

/**
 * Pretty-print an HTML string with `oxfmt`. Maizzle defaults
 * (`printWidth: 320`, `htmlWhitespaceSensitivity: 'ignore'`,
 * `embeddedLanguageFormatting: 'off'`) are merged underneath any options
 * you pass.
 *
 * @param html    HTML string to format.
 * @param options [oxfmt `FormatOptions`](https://github.com/oxc-project/oxfmt).
 * @returns       The formatted HTML string.
 *
 * @example
 * import { format } from '@maizzle/framework'
 *
 * const pretty = await format(html, { useTabs: true, tabWidth: 4 })
 */
export async function format(html: string, options: FormatOptions = {}): Promise<string> {
  const merged = merge(options, DEFAULT_OPTIONS)
  const result = await oxfmt('input.html', html, merged)
  return result.code
}

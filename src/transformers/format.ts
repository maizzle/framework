import { format as oxfmt } from 'oxfmt'
import { defu as merge } from 'defu'
import type { FormatOptions } from 'oxfmt'
import type { MaizzleConfig } from '../types/config.ts'

const DEFAULT_OPTIONS: FormatOptions = {
  printWidth: 320,
  htmlWhitespaceSensitivity: 'ignore',
  embeddedLanguageFormatting: 'off',
}

/**
 * Format transformer.
 *
 * Formats the HTML string using `oxfmt`. Accepts all oxfmt `FormatOptions`.
 *
 * Enable by setting `html.format: true` (or passing options).
 * User options are merged on top of the defaults.
 */
export async function format(html: string, config: MaizzleConfig = {}): Promise<string> {
  const option = config.html?.format

  if (!option) return html

  const userOptions: FormatOptions = typeof option === 'object' ? option : {}
  const options = merge(userOptions, DEFAULT_OPTIONS)

  const result = await oxfmt('input.html', html, options)

  return result.code
}

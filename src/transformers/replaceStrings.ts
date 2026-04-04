import type { MaizzleConfig } from '../types/config.ts'

/**
 * Replace strings transformer.
 *
 * Replaces strings in the HTML using the key-value pairs defined in
 * `config.replaceStrings`. Each key is treated as a regular expression
 * pattern (case-insensitive, global), and the value is the replacement.
 *
 * Character classes must be escaped in keys, e.g. `\\s` for `\s`.
 */
export function replaceStrings(html: string, config: MaizzleConfig = {}): string {
  const replacements = config.replaceStrings

  if (!replacements || Object.keys(replacements).length === 0) return html

  return Object.entries(replacements).reduce(
    (result, [pattern, replacement]) => result.replace(new RegExp(pattern, 'gi'), replacement),
    html,
  )
}

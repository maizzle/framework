import type { MaizzleConfig } from '../types/config.ts'

/**
 * Replace strings transformer.
 *
 * Replaces strings in the HTML using the key-value pairs defined in
 * `config.replaceStrings`. Each key is treated as a regular expression
 * pattern (case-insensitive, global), and the value is the replacement.
 *
 * Character classes must be escaped in keys, e.g. `\\s` for `\s`.
 *
 * @param skip Global regex of spans to leave untouched. Patterns still
 *             run on the whole document, so anchors and lookarounds
 *             keep their meaning; matches overlapping a span are
 *             left as they are.
 */
export function replaceStrings(html: string, config: MaizzleConfig = {}, skip?: RegExp): string {
  const replacements = config.replaceStrings

  if (!replacements || Object.keys(replacements).length === 0) return html

  return Object.entries(replacements).reduce(
    (result, [pattern, replacement]) => {
      const spans = skip ? [...result.matchAll(skip)].map(m => [m.index, m.index + m[0].length]) : []

      if (spans.length === 0) return result.replace(new RegExp(pattern, 'gi'), replacement)

      const sticky = new RegExp(pattern, 'iy')
      let cursor = 0

      return result.replace(new RegExp(pattern, 'gi'), (match: string, ...args: unknown[]) => {
        const groupsLast = typeof args.at(-1) !== 'string'
        const offset = args.at(groupsLast ? -3 : -2) as number
        const end = offset + match.length

        /**
         * Matches come in increasing offset order and spans are sorted,
         * so spans ending at or before this match can't overlap any
         * later match either: skip them for good.
         */
        while (cursor < spans.length && spans[cursor][1] <= offset) cursor++

        const span = spans[cursor]
        const overlaps = span !== undefined && (match.length ? end > span[0] : offset > span[0])

        if (overlaps) return match
        if (!replacement.includes('$')) return replacement

        // Expand `$1`, `$&`, `$'` etc. against the whole document
        sticky.lastIndex = offset
        const replaced = result.replace(sticky, replacement)
        return replaced.slice(offset, replaced.length - (result.length - end))
      })
    },
    html,
  )
}

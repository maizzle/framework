import { defu as merge } from 'defu'
import type { ChildNode } from 'domhandler'
import { parse, serialize, walk } from '../utils/ast/index.ts'
import { replaceChars } from '../utils/ast/serializer.ts'
import type { EntitiesConfig } from '../types/index.ts'

const DEFAULT_ENTITIES: Record<string, string> = {
  '\u200D': '&zwj;',
  '\u200C': '&zwnj;',
  '\u00A0': '&nbsp;',
  '\u00AD': '&shy;',
  '\u200B': '&#8203;',
  '\u2007': '&#8199;',
  '\uFEFF': '&#65279;',
  '\u034F': '&#847;',
  '\u2003': '&emsp;',
  '\u2028': '&LineSeparator;',
  '\u2029': '&ParagraphSeparator;',
  '\u00B7': '&middot;',
  '\u2013': '&ndash;',
  '\u2014': '&mdash;',
  '\u2018': '&lsquo;',
  '\u2019': '&rsquo;',
  '\u201C': '&ldquo;',
  '\u201D': '&rdquo;',
  '\u00AB': '&laquo;',
  '\u00BB': '&raquo;',
  '\u2022': '&bull;',
  '\u2039': '&lsaquo;',
  '\u203A': '&rsaquo;'
}

/**
 * Resolve the entity map for a `html.decodeEntities` config value: the
 * built-in map, merged with custom entries, or `null` when disabled.
 */
export function entityMap(custom: EntitiesConfig = true): Record<string, string> | null {
  if (!custom) return null
  return typeof custom === 'object'
    ? merge(custom as Record<string, string>, DEFAULT_ENTITIES)
    : DEFAULT_ENTITIES
}

/**
 * Replace literal Unicode characters in text and comment nodes with their
 * HTML entity equivalents (zero-width joiners, non-breaking spaces, smart
 * quotes, dashes, etc.) for better email-client rendering.
 *
 * @param html   HTML string to transform.
 * @param custom Extra entries merged on top of the built-in entity map, or
 *               `false` to disable the transform. Defaults to `true`
 *               (built-ins only).
 * @returns      The transformed HTML string.
 *
 * @example
 * import { entities } from '@maizzle/framework'
 *
 * // Defaults only
 * entities('hello world') // → 'hello&nbsp;world'
 *
 * // Add a custom mapping
 * entities('© Maizzle', { '©': '&copy;' })
 *
 * // Disable the transform
 * entities('hello world', false)
 */
export function entities(html: string, custom: EntitiesConfig = true): string {
  return serialize(commentEntitiesDom(parse(html), custom), { entities: entityMap(custom) ?? {} })
}

/**
 * Encode entities in comment nodes. Text nodes get their entities from
 * {@link serialize}, which escapes caller text first; comment data is written
 * verbatim, so it can hold entity strings directly.
 *
 * MSO conditional comment content is rendered by Outlook, and comment data
 * survives parse round-trips un-decoded — so encoding here protects
 * whitespace-only conditionals (e.g. `<Outlook>&nbsp;</Outlook>` spacers)
 * from being collapsed or removed by email-comb and html-crush downstream.
 */
export function commentEntitiesDom(dom: ChildNode[], custom: EntitiesConfig = true): ChildNode[] {
  const map = entityMap(custom)
  if (!map) return dom

  walk(dom, (node) => {
    if (node.type === 'comment') node.data = replaceChars(node.data, map)
  })

  return dom
}

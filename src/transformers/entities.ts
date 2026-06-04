import { defu as merge } from 'defu'
import type { ChildNode } from 'domhandler'
import { parse, serialize, walk } from '../utils/ast/index.ts'
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
 * Replace literal Unicode characters in text nodes with their HTML entity
 * equivalents (zero-width joiners, non-breaking spaces, smart quotes,
 * dashes, etc.) for better email-client rendering.
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
 * entities('hello world') // → 'hello&nbsp;world'
 *
 * // Add a custom mapping
 * entities('© Maizzle', { '©': '&copy;' })
 *
 * // Disable the transform
 * entities('hello world', false)
 */
export function entities(html: string, custom: EntitiesConfig = true): string {
  return serialize(entitiesDom(parse(html), custom))
}

/**
 * DOM-form of {@link entities} used by the internal transformer pipeline.
 * Takes a parsed DOM, returns a parsed DOM — avoids redundant
 * serialize/parse round-trips when chained with other transformers.
 */
export function entitiesDom(dom: ChildNode[], custom: EntitiesConfig = true): ChildNode[] {
  if (!custom) return dom

  const map = typeof custom === 'object'
    ? merge(custom as Record<string, string>, DEFAULT_ENTITIES)
    : DEFAULT_ENTITIES

  walk(dom, (node) => {
    if (node.type === 'text') {
      for (const [char, entity] of Object.entries(map)) {
        node.data = node.data.split(char).join(entity)
      }
    }
  })

  return dom
}

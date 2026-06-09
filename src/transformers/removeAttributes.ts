import type { ChildNode, Element } from 'domhandler'
import { parse, serialize, walk } from '../utils/ast/index.ts'

/**
 * Single attribute-removal rule.
 */
export interface RemoveAttributeRule {
  /** Attribute name to match. */
  name: string
  /**
   * Match condition for the attribute's value:
   * - `string` — remove when the value matches exactly.
   * - `RegExp` — remove when the value matches the regex.
   * - `boolean` / omitted — remove when the value is empty.
   */
  value?: string | RegExp | boolean
}

/**
 * Entry passed to {@link removeAttributes}. A bare string targets the named
 * attribute and removes it when its value is empty.
 */
export type RemoveAttributeOption = string | RemoveAttributeRule

/**
 * Remove HTML attributes from elements.
 *
 * Empty `style` and `class` attributes are always stripped, regardless of
 * what you pass. Your entries are appended to those defaults.
 *
 * - `'data-src'` — remove when the value is empty.
 * - `{ name: 'id', value: 'test' }` — remove when the value matches exactly.
 * - `{ name: 'data-id', value: /\d/ }` — remove when the value matches the regex.
 *
 * @param html       HTML string to transform.
 * @param attributes Additional attribute-removal rules to apply on top of the defaults.
 * @returns          The transformed HTML string.
 *
 * @example
 * import { removeAttributes } from '@maizzle/framework'
 *
 * const out = removeAttributes('<p style="" data-x="">x</p>', [
 *   'data-x',
 *   { name: 'role', value: 'none' },
 * ])
 */
export function removeAttributes(html: string, attributes: RemoveAttributeOption[] = []): string {
  return serialize(removeAttributesDom(parse(html), attributes))
}

/**
 * DOM-form of {@link removeAttributes} used by the internal transformer
 * pipeline. Takes a parsed DOM, returns a parsed DOM — avoids redundant
 * serialize/parse round-trips when chained with other transformers.
 */
export function removeAttributesDom(dom: ChildNode[], attributes: RemoveAttributeOption[] = []): ChildNode[] {
  // Empty style/class are always stripped; user entries are appended.
  const attributesToRemove: RemoveAttributeOption[] = ['style', 'class', ...attributes]

  walk(dom, (node) => {
    const el = node as Element
    if (!el.attribs) return

    for (const attr of attributesToRemove) {
      let attrName: string
      let attrValue: string | RegExp | boolean | undefined

      if (typeof attr === 'string') {
        attrName = attr
        attrValue = true // Remove when value is empty (boolean true or empty string)
      } else {
        attrName = attr.name
        attrValue = attr.value
      }

      const currentValue = el.attribs[attrName]

      // Skip if attribute doesn't exist
      if (currentValue === undefined) continue

      let shouldRemove = false

      if (typeof attrValue === 'boolean') {
        // Remove if value is empty (boolean true is treated as no-value attribute)
        shouldRemove = currentValue === '' || (currentValue as unknown) === true
      } else if (typeof attrValue === 'string') {
        // Remove if value matches exactly
        shouldRemove = currentValue === attrValue
      } else if (attrValue instanceof RegExp) {
        // Remove if value matches regex. Reset lastIndex first: a user-supplied
        // /g or /y regex is stateful across .test() calls, so reusing it over
        // many elements would otherwise match only every other one.
        attrValue.lastIndex = 0
        shouldRemove = attrValue.test(currentValue)
      } else {
        // Default: remove if empty
        shouldRemove = currentValue === ''
      }

      if (shouldRemove) {
        delete el.attribs[attrName]
      }
    }
  })

  return dom
}

import type { ChildNode, Element } from 'domhandler'
import { walk } from '../utils/ast/index.ts'
import type { AttributesConfig } from '../types/config.ts'

interface RemoveAttributeConfig {
  name: string
  value?: string | RegExp | boolean
}

type RemoveAttributeOption = string | RemoveAttributeConfig

/**
 * Remove attributes transformer.
 *
 * Removes specified HTML attributes from elements.
 *
 * By default, removes empty `style` and `class` attributes.
 *
 * Supports:
 * - String: removes attribute when empty (boolean or empty string)
 * - Object with name and value: removes when attribute matches exactly
 * - Object with name and RegExp value: removes when attribute value matches regex
 *
 * Configured via `remove` array:
 * ```js
 * {
 *   remove: [
 *     'data-src',                    // Remove empty data-src attributes
 *     { name: 'id', value: 'test' }, // Remove id="test" exactly
 *     { name: 'data-id', value: /\d/ } // Remove data-id when value contains digits
 *   ]
 * }
 * ```
 */
export function removeAttributes(dom: ChildNode[], config: AttributesConfig = {}): ChildNode[] {
  const removeOptions = config.remove

  // Always remove empty style and class attributes by default
  const alwaysRemove: RemoveAttributeOption[] = ['style', 'class']

  // Parse user options
  let userOptions: RemoveAttributeOption[] = []
  if (Array.isArray(removeOptions)) {
    userOptions = removeOptions as RemoveAttributeOption[]
  }

  // Combine default and user options
  const attributesToRemove: RemoveAttributeOption[] = [...alwaysRemove, ...userOptions]

  if (attributesToRemove.length === 0) {
    return dom
  }

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
        // Remove if value matches regex
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

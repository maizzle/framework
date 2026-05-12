import { defu as merge } from 'defu'
import type { ChildNode, Element } from 'domhandler'
import { parse, serialize, walk } from '../utils/ast/index.ts'
import type { AttributesConfig } from '../types/config.ts'

/**
 * Default attributes to add to elements.
 */
const DEFAULT_ATTRIBUTES: Record<string, Record<string, string | boolean | number>> = {
  table: {
    cellpadding: 0,
    cellspacing: 0,
    role: 'none',
  },
  img: {
    alt: '',
  },
}

/**
 * Add attributes transformer.
 *
 * Automatically adds attributes to HTML elements based on CSS selectors.
 *
 * Default attributes (can be disabled by setting `attributes.add` to false):
 * - table: cellpadding="0", cellspacing="0", role="none"
 * - img: alt=""
 *
 * Supports tag, class, id, and attribute selectors.
 * Multiple selectors can be specified by comma-separating them.
 *
 * @param html   HTML string to transform.
 * @param config Attributes config (see {@link AttributesConfig}).
 * @returns      The transformed HTML string.
 *
 * @example
 * import { addAttributes } from '@maizzle/framework'
 *
 * const out = addAttributes('<div></div>', {
 *   add: {
 *     div: { role: 'article' },
 *     '.test': { editable: true },
 *     '#header': { 'data-id': 'main' },
 *     'div, p': { class: 'content' },
 *   },
 * })
 */
export function addAttributes(html: string, config: AttributesConfig = {}): string {
  return serialize(addAttributesDom(parse(html), config))
}

/**
 * DOM-form of {@link addAttributes} used by the internal transformer pipeline.
 * Takes a parsed DOM, returns a parsed DOM — avoids redundant
 * serialize/parse round-trips when chained with other transformers.
 */
export function addAttributesDom(dom: ChildNode[], config: AttributesConfig = {}): ChildNode[] {
  const addConfig = config.add

  // Disabled when explicitly set to false
  if (addConfig === false) {
    return dom
  }

  // Deep merge user attributes on top of defaults using defu
  const userAttributes = typeof addConfig === 'object' ? addConfig : {}
  const attributesToAdd = merge(userAttributes, DEFAULT_ATTRIBUTES) as Record<string, false | Record<string, false | string | boolean | number>>

  if (Object.keys(attributesToAdd).length === 0) {
    return dom
  }

  // Process each selector pattern
  for (const [selectorPattern, attributes] of Object.entries(attributesToAdd)) {
    // User opted out of this selector entirely (e.g. `table: false`)
    if (attributes === false) continue
    // Split by comma for multiple selectors
    const selectors = selectorPattern.split(',').map(s => s.trim())

    walk(dom, (node) => {
      const el = node as Element
      if (!el.name) return

      // Check if element matches any selector in the pattern
      const matches = selectors.some(selector => elementMatches(el, selector))

      if (matches) {
        // Initialize attribs if needed
        if (!el.attribs) {
          el.attribs = {}
        }

        for (const [attrName, attrValue] of Object.entries(attributes)) {
          // User opted out of this specific attribute (e.g. `role: false`)
          if (attrValue === false) continue
          // Special handling for class - merge instead of replace
          if (attrName === 'class' && el.attribs.class) {
            const existingClasses = el.attribs.class.split(/\s+/).filter(Boolean)
            const newClasses = String(attrValue).split(/\s+/).filter(Boolean)
            const mergedClasses = [...new Set([...existingClasses, ...newClasses])]
            if (mergedClasses.join(' ') !== el.attribs.class) {
              el.attribs.class = mergedClasses.join(' ')
            }
          } else {
            // Only add attribute if not already present
            if (!(attrName in el.attribs)) {
              el.attribs[attrName] = String(attrValue)
            }
          }
        }
      }
    })
  }

  return dom
}

/**
 * Check if an element matches a CSS selector.
 * Supports: tag, .class, #id, [attribute], [attribute=value]
 */
function elementMatches(el: Element, selector: string): boolean {
  // Remove whitespace
  selector = selector.trim()

  // Check for attribute selector [attr] or [attr=value]
  const attrMatch = selector.match(/^\[([^\]=]+)(?:=([^\]]*))?\]$/)
  if (attrMatch) {
    const [, attrName, attrValue] = attrMatch
    if (attrValue === undefined) {
      // Just checking if attribute exists
      return attrName in (el.attribs || {})
    } else {
      // Check if attribute has specific value
      return el.attribs?.[attrName] === attrValue
    }
  }

  // Check for class selector .class
  if (selector.startsWith('.')) {
    const className = selector.slice(1)
    const classes = el.attribs?.class?.split(/\s+/) || []
    return classes.includes(className)
  }

  // Check for id selector #id
  if (selector.startsWith('#')) {
    const id = selector.slice(1)
    return el.attribs?.id === id
  }

  // Check for tag selector (possibly with attribute)
  // Split tag from attribute if present, e.g., "div[role=alert]"
  const tagAttrMatch = selector.match(/^([a-z][a-z0-9]*)\[([^\]]+)\]$/i)
  if (tagAttrMatch) {
    const [, tagName, attrPart] = tagAttrMatch
    if (el.name !== tagName) return false

    // Parse attribute part: could be "attr" or "attr=value"
    const attrEqMatch = attrPart.match(/^([^=]+)(?:=(.*))?$/)
    if (attrEqMatch) {
      const [, attrName, attrValue] = attrEqMatch
      if (attrValue === undefined) {
        return attrName in (el.attribs || {})
      } else {
        return el.attribs?.[attrName] === attrValue
      }
    }
    return false
  }

  // Simple tag selector
  return el.name === selector
}

import type { ChildNode, Element } from 'domhandler'
import { parse, serialize, walk } from '../utils/ast/index.ts'

/**
 * Default list of attributes that can be converted to inline styles.
 */
const DEFAULT_ATTRIBUTES = ['width', 'height', 'bgcolor', 'background', 'align', 'valign']

/**
 * Convert HTML attributes to inline CSS styles.
 *
 * Supported attributes:
 * - `width`: `width: ${value}${unit}` (px and %, defaults to px)
 * - `height`: `height: ${value}${unit}` (px and %, defaults to px)
 * - `bgcolor`: `background-color: ${value}`
 * - `background`: `background-image: url('${value}')`
 * - `align`: on `<table>`, `left`/`right` become `float`, `center` becomes
 *   `margin-left/right: auto`; on other elements, becomes `text-align`
 * - `valign`: `vertical-align: ${value}`
 *
 * @param html       HTML string to transform.
 * @param attributes `true` to process the default set, an array to restrict
 *                   to specific attribute names, `false` to disable.
 * @returns          The transformed HTML string.
 *
 * @example
 * import { attributeToStyle } from '@maizzle/framework'
 *
 * const out = attributeToStyle('<table align="center"><tr><td bgcolor="#f00">x</td></tr></table>')
 *
 * // Restrict to specific attributes:
 * const limited = attributeToStyle(html, ['width', 'height'])
 */
export function attributeToStyle(html: string, attributes: boolean | string[] = true): string {
  return serialize(attributeToStyleDom(parse(html), attributes))
}

/**
 * DOM-form of {@link attributeToStyle} used by the internal transformer
 * pipeline. Takes a parsed DOM, returns a parsed DOM — avoids redundant
 * serialize/parse round-trips when chained with other transformers.
 */
export function attributeToStyleDom(dom: ChildNode[], attributes: boolean | string[] = true): ChildNode[] {
  if (!attributes) return dom

  const attributesToProcess: string[] = attributes === true
    ? DEFAULT_ATTRIBUTES
    : Array.isArray(attributes)
      ? attributes
      : []

  if (attributesToProcess.length === 0) return dom

  walk(dom, (node) => {
    const el = node as Element

    if (!('attribs' in el) || !el.attribs) {
      return
    }

    const styles: string[] = []

    for (const attr of attributesToProcess) {
      const value = el.attribs[attr]
      if (!value) continue

      const styleValue = convertAttributeToStyle(el.name, attr, value)
      if (styleValue) {
        styles.push(styleValue)
      }
    }

    // Append new styles to existing style attribute
    if (styles.length > 0) {
      const existingStyle = el.attribs.style || ''
      const separator = existingStyle ? '; ' : ''
      el.attribs.style = existingStyle + separator + styles.join('; ')
    }
  })

  return dom
}

/**
 * Convert a single HTML attribute value to a CSS style declaration.
 */
function convertAttributeToStyle(
  tagName: string,
  attr: string,
  value: string,
): string | null {
  switch (attr) {
    case 'width':
    case 'height': {
      // Support px and % values, default to px if no unit
      const normalizedValue = /^\d+$/.test(value) ? `${value}px` : value
      return `${attr}: ${normalizedValue}`
    }

    case 'bgcolor':
      return `background-color: ${value}`

    case 'background':
      return `background-image: url('${value}')`

    case 'align': {
      // On table elements: left/right -> float, center -> margin auto
      if (tagName === 'table') {
        if (value === 'left' || value === 'right') {
          return `float: ${value}`
        }
        if (value === 'center') {
          return 'margin-left: auto; margin-right: auto'
        }
      }
      // On other elements: text-align
      return `text-align: ${value}`
    }

    case 'valign':
      return `vertical-align: ${value}`

    default:
      return null
  }
}

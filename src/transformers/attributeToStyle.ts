import type { ChildNode, Element } from 'domhandler'
import { walk } from '../utils/ast/index.ts'
import type { CssConfig } from '../types/config.ts'

/**
 * Default list of attributes that can be converted to inline styles.
 */
const DEFAULT_ATTRIBUTES = ['width', 'height', 'bgcolor', 'background', 'align', 'valign']

/**
 * Convert HTML attributes to inline CSS styles.
 *
 * Supported attributes:
 * - width: converted to `width: ${value}${unit}` (supports px and %, defaults to px)
 * - height: converted to `height: ${value}${unit}` (supports px and %, defaults to px)
 * - bgcolor: converted to `background-color: ${value}`
 * - background: converted to `background-image: url('${value}')`
 * - align: on `<table>` elements, `left`/`right` become `float`, `center` becomes `margin: 0 auto`;
 *          on other elements, becomes `text-align: ${value}`
 * - valign: converted to `vertical-align: ${value}`
 *
 * Enabled via `config.css.inline.attributeToStyle`:
 * - `true`: process all default attributes
 * - `false` or `undefined`: disabled (returns html unchanged)
 * - `string[]`: process only the specified attributes
 */
export function attributeToStyle(dom: ChildNode[], config: CssConfig = {}): ChildNode[] {
  const inline = config.inline

  // Disabled when inline is a boolean or undefined
  if (typeof inline !== 'object' || inline === null) {
    return dom
  }

  const option = inline.attributeToStyle

  // Disabled when not set or explicitly false
  if (!option) {
    return dom
  }

  // Determine which attributes to process
  const attributesToProcess: string[] =
    option === true
      ? DEFAULT_ATTRIBUTES
      : Array.isArray(option)
        ? option
        : []

  if (attributesToProcess.length === 0) {
    return dom
  }

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

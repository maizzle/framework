import { conv } from 'color-shorthand-hex-to-six-digit'
import type { ChildNode, Element } from 'domhandler'
import { walk } from '../utils/ast/index.ts'
import type { CssConfig } from '../types/config.ts'

const targets = new Set(['bgcolor', 'color'])

/**
 * Six-digit HEX transformer.
 *
 * Converts 3-digit HEX color codes to 6-digit in `bgcolor` and `color`
 * attributes, for better email client compatibility.
 *
 * Enabled by default via `css.sixHex`.
 */
export function sixHex(dom: ChildNode[], config: CssConfig = {}): ChildNode[] {
  if (config.sixHex === false) {
    return dom
  }

  walk(dom, (node) => {
    const el = node as Element

    if (!el.attribs) {
      return
    }

    for (const attr of targets) {
      const value = el.attribs[attr]

      if (value) {
        el.attribs[attr] = conv(value)
      }
    }
  })

  return dom
}

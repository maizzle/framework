import { conv } from 'color-shorthand-hex-to-six-digit'
import type { ChildNode, Element } from 'domhandler'
import { parse, serialize, walk } from '../utils/ast/index.ts'

const targets = new Set(['bgcolor', 'color'])

/**
 * Convert 3-digit HEX color codes to 6-digit in `bgcolor` and `color`
 * attributes, for better email client compatibility.
 *
 * @param html HTML string to transform.
 * @returns    The transformed HTML string.
 *
 * @example
 * import { sixHex } from '@maizzle/framework'
 *
 * const out = sixHex('<font color="#abc">x</font>')
 */
export function sixHex(html: string): string {
  return serialize(sixHexDom(parse(html)))
}

/**
 * DOM-form of {@link sixHex} used by the internal transformer pipeline.
 * Takes a parsed DOM, returns a parsed DOM — avoids redundant
 * serialize/parse round-trips when chained with other transformers.
 */
export function sixHexDom(dom: ChildNode[]): ChildNode[] {
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

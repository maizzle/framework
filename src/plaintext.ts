import { stripHtml } from 'string-strip-html'
import defu from 'defu'
import { Text } from 'domhandler'
import type { ChildNode, Element } from 'domhandler'
import { parse, serialize } from './utils/ast/index.ts'

const defaults = {
  dumpLinkHrefsNearby: {
    enabled: true,
    putOnNewLine: true,
  },
}

/**
 * Elements that start a new paragraph in the plaintext output.
 */
const BLOCK_TAGS = new Set([
  'address', 'article', 'aside', 'blockquote', 'center', 'dd', 'div', 'dl', 'dt',
  'figcaption', 'figure', 'footer', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header',
  'hr', 'main', 'nav', 'ol', 'p', 'pre', 'section', 'table', 'td', 'th', 'tr', 'ul',
])

const PRESERVE_WHITESPACE_TAGS = new Set(['pre', 'textarea', 'script', 'style'])

/**
 * Zero-width and filler characters used for spacing in HTML emails
 * (`&zwj;` in Spacer/Hr, Preheader fillers, MSO button padding).
 */
const INVISIBLE_CHARS = /[\u00AD\u034F\u200B-\u200D\u2060\uFEFF]/g

/**
 * Collapse source whitespace like a browser would, then surround
 * block-level elements with line breaks, so that the plaintext
 * structure doesn't depend on how the HTML was formatted.
 */
function addLineBreaks(nodes: ChildNode[], preserveWhitespace = false): ChildNode[] {
  return nodes.flatMap<ChildNode>((node) => {
    if (node.type === 'text') {
      if (!preserveWhitespace) {
        (node as Text).data = (node as Text).data.replace(/[ \t\n\r\f]+/g, ' ')
      }
      return [node]
    }

    if (!('children' in node)) return [node]

    const el = node as Element
    el.children = addLineBreaks(el.children, preserveWhitespace || PRESERVE_WHITESPACE_TAGS.has(el.name))

    if (el.name === 'br') return [el, new Text('\n')]
    if (el.name === 'li') return [new Text('\n'), el]
    if (BLOCK_TAGS.has(el.name)) return [new Text('\n\n'), el, new Text('\n\n')]

    return [el]
  })
}

export function createPlaintext(html: string, options?: Record<string, unknown>): string {
  const { result } = stripHtml(serialize(addLineBreaks(parse(html))), defu(options, defaults))

  return result
    .replace(INVISIBLE_CHARS, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

import render from 'dom-serializer'
import { cloneNode } from 'domhandler'
import type { ChildNode, Element, ParentNode } from 'domhandler'
import type { DomSerializerOptions } from 'dom-serializer'

/**
 * Elements whose text htmlparser2 keeps raw (undecoded) in HTML content, so it
 * must be written back unescaped. Must match the parser exactly: escaping more
 * breaks CSS/JS, escaping less lets decoded text become markup.
 */
const RAW_TEXT_ELEMENTS = new Set(['style', 'script', 'xmp', 'iframe', 'noembed', 'noframes', 'plaintext'])

/** Elements that start SVG/MathML content, where nothing is raw text. */
const FOREIGN_ELEMENTS = new Set(['svg', 'math'])

/** Elements that switch back to HTML content inside SVG/MathML, as in htmlparser2. */
const HTML_INTEGRATION_ELEMENTS = new Set(['mi', 'mo', 'mn', 'ms', 'mtext', 'annotation-xml', 'foreignObject', 'desc', 'title'])

export interface SerializeOptions extends DomSerializerOptions {
  /** Characters to write as entities in text nodes, e.g. `{ '\u00A0': '&nbsp;' }`. */
  entities?: Record<string, string>
  /**
   * Single-quote attribute values that contain `"` but no `'`. Only
   * for final output: juice rewrites single-quoted attributes
   * as double-quoted, so intermediate passes can't use it.
   */
  singleQuoteAttributes?: boolean
}

/**
 * Serialize a DOM to HTML.
 *
 * The parser decodes entities, so text and attribute values hold the
 * characters they represent. Escaping them again here keeps every
 * parse/serialize round trip lossless: a caller's `&amp;colon;` stays
 * literal text instead of becoming `&colon;` and, after another pass, `:`.
 *
 * Text nodes are written with `entities` applied after escaping, so generated
 * entities are never confused with caller data. Comments (including MSO
 * conditionals) and raw-text elements are written verbatim.
 */
export function serialize(dom: ChildNode[], options: SerializeOptions = {}): string {
  const { entities = {}, singleQuoteAttributes, ...renderOptions } = options

  /**
   * dom-serializer always double-quotes values and writes inner `"` as
   * `&quot;`, which breaks ESP tags that take string arguments, like
   * `href='{{ url "vip" }}'`. Swap those quotes for a random ASCII
   * token that no encoding mode alters, and single-quote only
   * the values that end up holding the token.
   */
  const quote = singleQuoteAttributes ? `__MZQ_${crypto.randomUUID().replaceAll('-', '')}__` : undefined

  // Keep the original parents so isRawText can see the copy's ancestors.
  const copy = dom.map((node) => {
    const clone = cloneNode(node, true)
    clone.parent = node.parent
    return clone
  })
  escapeNodes(copy, isRawText(dom[0]?.parent), entities, quote)

  // Text and attributes are escaped above; dom-serializer only quotes attributes.
  const html = render(copy, { ...renderOptions, encodeEntities: false })
  if (!quote || !html.includes(quote)) return html

  return html.replace(
    new RegExp(`="([^"]*${quote}[^"]*)"`, 'g'),
    (_, value: string) => `='${value.replaceAll(quote, '"')}'`,
  )
}

/** Whether the parser kept this element's text raw. */
export function isRawText(node: ParentNode | null | undefined): boolean {
  if (!RAW_TEXT_ELEMENTS.has((node as Element | null)?.name ?? '')) return false

  for (let ancestor = node!.parent; ancestor; ancestor = ancestor.parent) {
    const name = (ancestor as Element).name
    if (FOREIGN_ELEMENTS.has(name)) return false
    if (HTML_INTEGRATION_ELEMENTS.has(name)) return true
  }

  return true
}

function escapeNodes(nodes: ChildNode[], inRawText: boolean, entities: Record<string, string>, quote?: string): void {
  for (const node of nodes) {
    // CDATA content is literal
    if (node.type === 'cdata') continue
    if (node.type === 'text' && !inRawText) node.data = escapeText(node.data, entities)
    if ('attribs' in node) {
      for (const name in node.attribs) {
        let value = node.attribs[name].replace(/&/g, '&amp;')
        if (quote && value.includes('"') && !value.includes("'")) value = value.replaceAll('"', quote)
        node.attribs[name] = value
      }
    }
    if ('children' in node) escapeNodes(node.children, isRawText(node), entities, quote)
  }
}

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;' }

function escapeText(text: string, entities: Record<string, string>): string {
  return replaceChars(text, { ...ESCAPES, ...entities })
}

/**
 * Replace every occurrence of the map's keys in one pass, so replacements are
 * never matched again: `{ '©': '&copy;', c: 'X' }` turns `©c` into `&copy;X`.
 * Longer keys win over shorter ones that start at the same position.
 */
export function replaceChars(text: string, map: Record<string, string>): string {
  const keys = Object.keys(map).filter(Boolean).sort((a, b) => b.length - a.length)
  if (keys.length === 0) return text
  const pattern = new RegExp(keys.map(key => key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g')
  return text.replace(pattern, match => map[match])
}

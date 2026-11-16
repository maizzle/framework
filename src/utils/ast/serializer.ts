import render from 'dom-serializer'
import type { ChildNode, Element, Text } from 'domhandler'
import type { DomSerializerOptions } from 'dom-serializer'

const RAW_TEXT_ELEMENTS = new Set(['script', 'style'])

/**
 * Re-encode `<` and `>` in text nodes before serialization.
 *
 * The parser decodes entities like `&lt;` into raw `<` in text nodes. With
 * `encodeEntities: false` (needed so other transformers can emit entity
 * strings such as `&nbsp;` verbatim), the serializer would write those raw
 * `<` characters as-is, turning escaped text (e.g. a Vue `{{ html }}`
 * interpolation containing `<p>...</p>`) into real DOM downstream.
 *
 * `&` is intentionally not re-encoded: the `entities` transformer writes
 * literal entity strings (`&nbsp;`, `&mdash;`) directly into text-node data
 * and relies on the serializer leaving them alone.
 *
 * Skip `<script>` / `<style>` — their children are raw-text containers, and
 * CSS/JS legitimately contains `<` and `>`.
 */
function encodeTextNodes(dom: ChildNode[], inRawText = false): void {
  for (const node of dom) {
    if (node.type === 'text') {
      if (!inRawText) {
        const text = node as Text
        text.data = text.data
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
      }
      continue
    }

    if ('children' in node && (node as Element).children?.length) {
      const el = node as Element
      const nextRaw = inRawText || RAW_TEXT_ELEMENTS.has(el.name)
      encodeTextNodes(el.children as ChildNode[], nextRaw)
    }
  }
}

function hideDoubleQuotes(dom: ChildNode[], token: string, hidden: Array<[Element, string, string]>): void {
  for (const node of dom) {
    if (!('children' in node)) continue

    const el = node as Element
    for (const [name, value] of Object.entries(el.attribs ?? {})) {
      if (value.includes('"') && !value.includes("'")) {
        hidden.push([el, name, value])
        el.attribs[name] = value.replaceAll('"', token)
      }
    }

    hideDoubleQuotes(el.children as ChildNode[], token, hidden)
  }
}

export interface SerializeOptions extends DomSerializerOptions {
  /**
   * Single-quote attribute values that contain `"` but no `'`. Only
   * for final output: juice rewrites single-quoted attributes
   * as double-quoted, so intermediate passes can't use it.
   */
  singleQuoteAttributes?: boolean
}

export function serialize(dom: ChildNode[], options: SerializeOptions = {}): string {
  const { singleQuoteAttributes, ...renderOptions } = options

  encodeTextNodes(dom)

  if (!singleQuoteAttributes) return render(dom, { encodeEntities: false, ...renderOptions })

  /**
   * dom-serializer always double-quotes values and writes inner `"` as
   * `&quot;`, which breaks ESP tags that take string arguments, like
   * `href='{{ url "vip" }}'`. Swap those quotes for a random ASCII
   * token that no encoding mode alters, and single-quote only
   * the values that end up holding the token.
   */
  const token = `__MZQ_${crypto.randomUUID().replaceAll('-', '')}__`
  const hidden: Array<[Element, string, string]> = []
  hideDoubleQuotes(dom, token, hidden)

  const html = render(dom, { encodeEntities: false, ...renderOptions })
  if (!hidden.length) return html

  for (const [el, name, value] of hidden) el.attribs[name] = value

  return html.replace(
    new RegExp(`="([^"]*${token}[^"]*)"`, 'g'),
    (_, value: string) => `='${value.replaceAll(token, '"')}'`,
  )
}

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

export function serialize(dom: ChildNode[], options?: DomSerializerOptions): string {
  encodeTextNodes(dom)
  return render(dom, { encodeEntities: false, ...options })
}

import render from 'dom-serializer'
import type { ChildNode } from 'domhandler'
import type { DomSerializerOptions } from 'dom-serializer'
import { walk } from './walker.ts'

/**
 * Re-encode < and > as entities in text nodes inside <code> elements.
 *
 * The DOM parser decodes entities like &#x3C; into raw < in text nodes.
 * With encodeEntities: false the serializer outputs them as-is, which
 * creates broken HTML (e.g. </a> inside a code block closes the real tag).
 *
 * We selectively fix this for <code> contents only, so the rest of the
 * document (where encodeEntities: false is needed) is unaffected.
 */
function encodeCodeTextNodes(dom: ChildNode[]): void {
  walk(dom, (node) => {
    const el = node as import('domhandler').Element
    if (el.name !== 'code') return

    walk(el.children ?? [], (child) => {
      if (child.type === 'text') {
        const text = child as import('domhandler').Text
        text.data = text.data.replace(/</g, '&lt;').replace(/>/g, '&gt;')
      }
    })
  })
}

export function serialize(dom: ChildNode[], options?: DomSerializerOptions): string {
  encodeCodeTextNodes(dom)
  return render(dom, { encodeEntities: false, ...options })
}

import render from 'dom-serializer'
import type { ChildNode } from 'domhandler'
import type { DomSerializerOptions } from 'dom-serializer'

export function serialize(dom: ChildNode[], options?: DomSerializerOptions): string {
  return render(dom, { encodeEntities: false, ...options })
}

import render from 'dom-serializer'
import type { ChildNode, DomHandlerOptions } from 'domhandler'

export function serialize(dom: ChildNode[], options?: DomHandlerOptions): string {
  return render(dom, { encodeEntities: false, ...options })
}

import { walk } from '../utils/ast/index.ts'
import type { ChildNode, Element } from 'domhandler'

const PADDING_DECL_RE = /(?:^|;)\s*(padding(?:-[a-z-]+)?\s*:\s*[^;]+)/gi

/**
 * Resolve `__MAIZZLE_MSOTDSTYLE_{id}__` placeholders inside MSO conditional
 * comments by extracting `padding*` declarations from the inlined style
 * of the paired element (marked with `data-maizzle-mso-td-id`) and
 * appending the value of `data-maizzle-mso-style` (the Container's
 * `msoStyle` prop).
 *
 * Why: the Container's MSO ghost table wraps the outer div, so CSS padding
 * the user puts on the div (e.g. `class="px-6"`) doesn't visually apply
 * inside Outlook — Outlook lays out the inner content against the td,
 * not the div. Mirroring the padding onto the td fixes that.
 *
 * msoStyle is appended last so it wins on duplicate properties — that
 * lets users override the auto-mirrored padding with `msoStyle`
 * when the two need to diverge.
 */
export function msoTdStyleFromClass(dom: ChildNode[]): ChildNode[] {
  const styles = new Map<string, string>()

  walk(dom, (node) => {
    const el = node as Element
    const id = el.attribs?.['data-maizzle-mso-td-id']
    if (!id) return
    delete el.attribs['data-maizzle-mso-td-id']

    const msoStyle = (el.attribs['data-maizzle-mso-style'] ?? '').trim().replace(/;\s*$/, '')
    delete el.attribs['data-maizzle-mso-style']

    const parts: string[] = []
    const style = el.attribs.style
    if (style) {
      for (const m of style.matchAll(PADDING_DECL_RE)) {
        parts.push(m[1].trim())
      }
    }
    if (msoStyle) parts.push(msoStyle)

    styles.set(id, parts.length ? ` style="${parts.join('; ')}"` : '')
  })

  if (styles.size === 0) return dom

  walk(dom, (node) => {
    if (node.type !== 'comment') return
    let data = (node as any).data as string
    if (!data?.includes('__MAIZZLE_MSOTDSTYLE_')) return
    for (const [id, val] of styles) {
      data = data.replaceAll(`__MAIZZLE_MSOTDSTYLE_${id}__`, val)
    }
    ;(node as any).data = data
  })

  return dom
}

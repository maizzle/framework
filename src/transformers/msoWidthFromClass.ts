import { walk } from '../utils/ast/index.ts'
import type { ChildNode, Element } from 'domhandler'

const RE_MAX_WIDTH = /(?:^|;\s*)max-width:\s*([^;]+)/i
const RE_WIDTH = /(?:^|;\s*)width:\s*([^;]+)/i
const RE_PERCENT = /^[\d.]+%$/

function resolveWidth(value: string): string | null {
  const trimmed = value.trim()
  if (RE_PERCENT.test(trimmed)) return trimmed
  const m = trimmed.match(/^([\d.]+)(px|rem|em|pt)?$/i)
  if (!m) return null
  const n = parseFloat(m[1])
  switch ((m[2] || 'px').toLowerCase()) {
    case 'px': return `${Math.round(n)}px`
    case 'rem':
    case 'em': return `${Math.round(n * 16)}px`
    case 'pt': return `${Math.round(n * 1.333)}px`
    default: return null
  }
}

/**
 * Resolve `__MAIZZLE_MSOW_{id}__` placeholders inside MSO conditional
 * comments by reading the inlined `max-width` (or `width`) of the
 * paired element marked with `data-maizzle-msow-id`.
 *
 * Used by `<Container>` and `<Section>` to derive Outlook's table width
 * from the resolved Tailwind class or inline style on the inner div,
 * after CSS inlining.
 *
 * Falls back to the value of `data-maizzle-msow-fallback` (default
 * `600px`) when the value can't be parsed.
 */
export function msoWidthFromClass(dom: ChildNode[]): ChildNode[] {
  const widths = new Map<string, string>()

  walk(dom, (node) => {
    const el = node as Element
    const id = el.attribs?.['data-maizzle-msow-id']
    if (!id) return
    delete el.attribs['data-maizzle-msow-id']

    const fallback = el.attribs['data-maizzle-msow-fallback'] ?? '600px'
    delete el.attribs['data-maizzle-msow-fallback']

    const style = el.attribs.style ?? ''
    const raw = style.match(RE_MAX_WIDTH)?.[1] ?? style.match(RE_WIDTH)?.[1]
    const resolved = raw ? resolveWidth(raw) : null
    widths.set(id, resolved ?? fallback)
  })

  if (widths.size === 0) return dom

  walk(dom, (node) => {
    if (node.type !== 'comment') return
    let data = (node as any).data as string
    if (!data.includes('__MAIZZLE_MSOW_')) return
    for (const [id, px] of widths) {
      data = data.replaceAll(`__MAIZZLE_MSOW_${id}__`, px)
    }
    ;(node as any).data = data
  })

  return dom
}

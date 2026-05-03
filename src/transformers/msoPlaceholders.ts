import { walk } from '../utils/ast/index.ts'
import type { ChildNode, Element } from 'domhandler'

const RE_MAX_WIDTH = /(?:^|;\s*)max-width:\s*([^;]+)/i
const RE_WIDTH = /(?:^|;\s*)width:\s*([^;]+)/i
const RE_PERCENT = /^[\d.]+%$/
const PADDING_DECL_RE = /(?:^|;)\s*(padding(?:-[a-z-]+)?\s*:\s*[^;]+)/gi

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
 * Resolve all `__MAIZZLE_MSO*__` placeholders inside MSO conditional comments
 * by reading inlined style + `data-*` markers on the paired elements.
 *
 * Two placeholder families:
 *
 * MSOW (`__MAIZZLE_MSOW_{id}__`) — emitted by `<Container>` and `<Section>`.
 *   Source element is marked with `data-maizzle-msow-id`. Reads inlined
 *   `max-width:` (falls back to `width:`) and normalizes to px. Falls
 *   back to `data-maizzle-msow-fallback` (default `600px`) when the
 *   value can't be parsed.
 *
 * MSOTDSTYLE (`__MAIZZLE_MSOTDSTYLE_{id}__`) — emitted by `<Container>`'s
 *   MSO `<td>`. Source element is marked with `data-maizzle-mso-td-id`.
 *   Copies every `padding*` declaration from inlined style and appends
 *   the `data-maizzle-mso-style` value (the user's `msoStyle` prop).
 *   Empty input resolves to '' so the placeholder collapses cleanly.
 *
 * Single collect-walk + single substitute-walk: the same Container div
 * carries both marker kinds, so one element visit fills both maps.
 */
export function msoPlaceholders(dom: ChildNode[]): ChildNode[] {
  const widths = new Map<string, string>()
  const tdStyles = new Map<string, string>()

  walk(dom, (node) => {
    const el = node as Element
    const a = el.attribs
    if (!a) return

    const msowId = a['data-maizzle-msow-id']
    const tdId = a['data-maizzle-mso-td-id']
    if (!msowId && !tdId) return

    const style = a.style ?? ''

    if (msowId) {
      delete a['data-maizzle-msow-id']
      const fallback = a['data-maizzle-msow-fallback'] ?? '600px'
      delete a['data-maizzle-msow-fallback']
      const raw = style.match(RE_MAX_WIDTH)?.[1] ?? style.match(RE_WIDTH)?.[1]
      const resolved = raw ? resolveWidth(raw) : null
      widths.set(msowId, resolved ?? fallback)
    }

    if (tdId) {
      delete a['data-maizzle-mso-td-id']
      const msoStyle = (a['data-maizzle-mso-style'] ?? '').trim().replace(/;\s*$/, '')
      delete a['data-maizzle-mso-style']

      const parts: string[] = []
      if (style) {
        for (const m of style.matchAll(PADDING_DECL_RE)) {
          parts.push(m[1].trim())
        }
      }
      if (msoStyle) parts.push(msoStyle)

      tdStyles.set(tdId, parts.length ? ` style="${parts.join('; ')}"` : '')
    }
  })

  if (widths.size === 0 && tdStyles.size === 0) return dom

  walk(dom, (node) => {
    if (node.type !== 'comment') return
    let data = (node as any).data as string
    if (!data) return
    const hasMsow = widths.size > 0 && data.includes('__MAIZZLE_MSOW_')
    const hasTd = tdStyles.size > 0 && data.includes('__MAIZZLE_MSOTDSTYLE_')
    if (!hasMsow && !hasTd) return

    if (hasMsow) {
      for (const [id, val] of widths) {
        data = data.replaceAll(`__MAIZZLE_MSOW_${id}__`, val)
      }
    }
    if (hasTd) {
      for (const [id, val] of tdStyles) {
        data = data.replaceAll(`__MAIZZLE_MSOTDSTYLE_${id}__`, val)
      }
    }
    ;(node as any).data = data
  })

  return dom
}

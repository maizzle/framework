import { walk } from '../utils/ast/index.ts'
import type { ChildNode, Element, ParentNode } from 'domhandler'

const RE_MAX_WIDTH = /(?:^|;\s*)max-width:\s*([^;]+)/i
const RE_WIDTH = /(?:^|;\s*)width:\s*([^;]+)/i
const RE_MIN_WIDTH = /(?:^|;\s*)min-width:\s*([^;]+)/i
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

function divideWidth(value: string, divisor: number): string | null {
  const m = value.match(/^([\d.]+)(px|%)$/)
  if (!m || divisor < 1) return null
  const n = parseFloat(m[1])
  return `${parseFloat((n / divisor).toFixed(2))}${m[2]}`
}

function depth(node: ChildNode): number {
  let d = 0
  let cur: ParentNode | null = node.parent
  while (cur) {
    d++
    cur = (cur as any).parent ?? null
  }
  return d
}

function readSourceWidth(el: Element): string | null {
  const explicit = el.attribs?.['data-maizzle-cw']
  if (explicit) {
    const r = resolveWidth(explicit)
    if (r) return r
  }
  if (explicit !== undefined) {
    // empty marker — read from inlined style
    const style = el.attribs.style ?? ''
    const raw = style.match(RE_MAX_WIDTH)?.[1]
      ?? style.match(RE_WIDTH)?.[1]
      ?? style.match(RE_MIN_WIDTH)?.[1]
    return raw ? resolveWidth(raw) : null
  }
  return null
}

/**
 * Resolve `__MAIZZLE_COLW_{id}__` placeholders inside `min-width` declarations
 * on Column divs (and inside MSO conditional comments) by walking up to the
 * nearest ancestor marked with `data-maizzle-cw` (Container, Section, Row,
 * or another Column already resolved) and dividing its resolved width by
 * the column count from `data-maizzle-cw-count`.
 *
 * Resolution rules:
 * - Style placeholders (`min-width`): replaced with px when resolvable,
 *   otherwise the entire `min-width` declaration is stripped.
 * - Comment placeholders (MSO td `width`): replaced with px when resolvable,
 *   otherwise replaced with `${100/count}%` so Outlook still gets a width.
 *
 * After resolving, each column's resolved width is written back to
 * `data-maizzle-cw` so it acts as a width source for nested rows.
 * All `data-maizzle-cw*` attributes are stripped at the end.
 */
export function columnWidth(dom: ChildNode[]): ChildNode[] {
  const columns: { el: Element; id: string; count: number; d: number }[] = []

  walk(dom, (node) => {
    const el = node as Element
    const id = el.attribs?.['data-maizzle-cw-id']
    if (!id) return
    const count = parseInt(el.attribs['data-maizzle-cw-count'] || '1', 10)
    columns.push({ el, id, count, d: depth(node) })
  })

  // Resolve outer columns first so inner ones can inherit from them
  columns.sort((a, b) => a.d - b.d)

  const resolutions = new Map<string, string>()
  const fallbacks = new Map<string, string>()

  for (const { id, count } of columns) {
    fallbacks.set(id, `${Math.round(100 / Math.max(count, 1))}%`)
  }

  for (const { el, id, count } of columns) {
    let cur: ParentNode | null = el.parent
    while (cur) {
      const parentEl = cur as Element
      if (parentEl.attribs && 'data-maizzle-cw' in parentEl.attribs) {
        const w = readSourceWidth(parentEl)
        if (w) {
          const div = divideWidth(w, count)
          if (div) {
            resolutions.set(id, div)
            // expose self as a source for nested rows
            el.attribs['data-maizzle-cw'] = div
          }
        }
        break
      }
      cur = (cur as any).parent ?? null
    }
  }

  walk(dom, (node) => {
    if (node.type === 'comment') {
      const data = (node as any).data as string
      if (!data || !data.includes('__MAIZZLE_COLW_')) return
      ;(node as any).data = data.replace(
        /__MAIZZLE_COLW_([^_]+)__/g,
        (_m, mid) => resolutions.get(mid) ?? fallbacks.get(mid) ?? '100%'
      )
      return
    }

    const el = node as Element
    if (!el.attribs) return

    const style = el.attribs.style
    if (style && style.includes('__MAIZZLE_COLW_')) {
      const next = style.replace(
        /(?:^|;\s*)min-width:\s*__MAIZZLE_COLW_([^_]+)__\s*;?/g,
        (_m, mid) => resolutions.has(mid) ? `; min-width: ${resolutions.get(mid)}` : ''
      ).replace(/^;\s*/, '').replace(/;\s*$/, '').trim()
      if (next) el.attribs.style = next
      else delete el.attribs.style
    }

    delete el.attribs['data-maizzle-cw']
    delete el.attribs['data-maizzle-cw-id']
    delete el.attribs['data-maizzle-cw-count']
  })

  return dom
}

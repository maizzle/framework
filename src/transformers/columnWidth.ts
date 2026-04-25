import { walk } from '../utils/ast/index.ts'
import type { ChildNode, Element, ParentNode } from 'domhandler'

const RE_MAX_WIDTH = /(?:^|;\s*)max-width:\s*([^;]+)/i
const RE_WIDTH = /(?:^|;\s*)width:\s*([^;]+)/i
const RE_MIN_WIDTH = /(?:^|;\s*)min-width:\s*([^;]+)/i
const RE_MAX_HEIGHT = /(?:^|;\s*)max-height:\s*([^;]+)/i
const RE_HEIGHT = /(?:^|;\s*)height:\s*([^;]+)/i
const RE_MIN_HEIGHT = /(?:^|;\s*)min-height:\s*([^;]+)/i
const RE_PERCENT = /^[\d.]+%$/

function resolveLength(value: string): string | null {
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

function divideLength(value: string, divisor: number): string | null {
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

function readWidthSource(el: Element): string | null {
  const explicit = el.attribs?.['data-maizzle-cw']
  if (explicit) {
    const r = resolveLength(explicit)
    if (r) return r
  }
  return readWidthFromStyle(el)
}

function readWidthFromStyle(el: Element): string | null {
  const style = el.attribs?.style ?? ''
  const raw = style.match(RE_MAX_WIDTH)?.[1]
    ?? style.match(RE_WIDTH)?.[1]
    ?? style.match(RE_MIN_WIDTH)?.[1]
  return raw ? resolveLength(raw) : null
}

function readHeightFromStyle(el: Element): string | null {
  const style = el.attribs?.style ?? ''
  const raw = style.match(RE_MAX_HEIGHT)?.[1]
    ?? style.match(RE_HEIGHT)?.[1]
    ?? style.match(RE_MIN_HEIGHT)?.[1]
  return raw ? resolveLength(raw) : null
}

/**
 * Resolve `__MAIZZLE_COLW_{id}__` and `__MAIZZLE_OH_{id}__` placeholders.
 *
 * COLW (column width) — emitted by `<Column>` and `<Overlap>`. Walks up to
 * the nearest ancestor marked with `data-maizzle-cw` (Container/Section/
 * Row/another Column already resolved) and divides by `data-maizzle-cw-count`.
 * If `data-maizzle-cw-self` is present, reads from the element's own inlined
 * `max-width`/`width`/`min-width` instead of walking up — used by `<Overlap>`
 * when it has its own width class/inline style.
 *
 * OH (overlap height) — emitted by `<Overlap>`. Reads `max-height`/`height`/
 * `min-height` from the element's own inlined style.
 *
 * Resolution rules:
 * - Style placeholders for `min-width`: replaced when resolvable, otherwise
 *   the entire `min-width` declaration is stripped.
 * - Other style placeholders (Overlap td `width`, etc.): replaced when
 *   resolvable, otherwise replaced with the count-based fallback or `100%`.
 * - Comment placeholders: same fallback chain.
 *
 * Resolved column widths are written back to `data-maizzle-cw` so nested
 * rows cascade. All `data-maizzle-cw*` and `data-maizzle-oh-*` attrs are
 * stripped at the end.
 */
export function columnWidth(dom: ChildNode[]): ChildNode[] {
  const columns: { el: Element; id: string; count: number; d: number; self: boolean }[] = []
  const heightTargets: { el: Element; id: string }[] = []

  walk(dom, (node) => {
    const el = node as Element
    if (!el.attribs) return

    const id = el.attribs['data-maizzle-cw-id']
    if (id) {
      const count = parseInt(el.attribs['data-maizzle-cw-count'] || '1', 10)
      const self = 'data-maizzle-cw-self' in el.attribs
      columns.push({ el, id, count, d: depth(node), self })
    }

    const ohId = el.attribs['data-maizzle-oh-id']
    if (ohId) heightTargets.push({ el, id: ohId })
  })

  columns.sort((a, b) => a.d - b.d)

  const widthResolutions = new Map<string, string>()
  const widthFallbacks = new Map<string, string>()

  for (const { id, count } of columns) {
    widthFallbacks.set(id, `${Math.round(100 / Math.max(count, 1))}%`)
  }

  for (const { el, id, count, self } of columns) {
    let sourceWidth: string | null = null

    if (self) {
      sourceWidth = readWidthFromStyle(el)
    } else {
      let cur: ParentNode | null = el.parent
      while (cur) {
        const parentEl = cur as Element
        if (parentEl.attribs && 'data-maizzle-cw' in parentEl.attribs) {
          sourceWidth = readWidthSource(parentEl)
          break
        }
        cur = (cur as any).parent ?? null
      }
    }

    if (sourceWidth) {
      const div = divideLength(sourceWidth, count)
      if (div) {
        widthResolutions.set(id, div)
        el.attribs['data-maizzle-cw'] = div
      }
    }
  }

  const heightResolutions = new Map<string, string>()
  for (const { el, id } of heightTargets) {
    const h = readHeightFromStyle(el)
    if (h) heightResolutions.set(id, h)
  }

  walk(dom, (node) => {
    if (node.type === 'comment') {
      const data = (node as any).data as string
      if (!data || (!data.includes('__MAIZZLE_COLW_') && !data.includes('__MAIZZLE_OH_'))) return
      ;(node as any).data = data
        .replace(/__MAIZZLE_COLW_([^_]+)__/g,
          (_m, mid) => widthResolutions.get(mid) ?? widthFallbacks.get(mid) ?? '100%')
        .replace(/__MAIZZLE_OH_([^_]+)__/g,
          (_m, hid) => heightResolutions.get(hid) ?? '100%')
      return
    }

    const el = node as Element
    if (!el.attribs) return

    const style = el.attribs.style
    if (style && (style.includes('__MAIZZLE_COLW_') || style.includes('__MAIZZLE_OH_'))) {
      let next = style.replace(
        /(?:^|;\s*)min-width:\s*__MAIZZLE_COLW_([^_]+)__\s*;?/g,
        (_m, mid) => widthResolutions.has(mid) ? `; min-width: ${widthResolutions.get(mid)}` : ''
      )
      next = next
        .replace(/__MAIZZLE_COLW_([^_]+)__/g,
          (_m, mid) => widthResolutions.get(mid) ?? widthFallbacks.get(mid) ?? '100%')
        .replace(/__MAIZZLE_OH_([^_]+)__/g,
          (_m, hid) => heightResolutions.get(hid) ?? '100%')
      next = next.replace(/^;\s*/, '').replace(/;\s*$/, '').trim()
      if (next) el.attribs.style = next
      else delete el.attribs.style
    }

    delete el.attribs['data-maizzle-cw']
    delete el.attribs['data-maizzle-cw-id']
    delete el.attribs['data-maizzle-cw-count']
    delete el.attribs['data-maizzle-cw-self']
    delete el.attribs['data-maizzle-oh-id']
  })

  return dom
}

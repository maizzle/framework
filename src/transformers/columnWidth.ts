import postcss, { type Root, type Declaration } from 'postcss'
import safeParser from 'postcss-safe-parser'
import { walk } from '../utils/ast/index.ts'
import { horizontalBorderPx, horizontalPaddingPx, lengthToPx } from '../utils/cssBox.ts'
import type { ChildNode, Element, ParentNode } from 'domhandler'

const RE_PERCENT = /^[\d.]+%$/

/**
 * Stringify decls into a `; `-joined inline-style attribute. PostCSS raws
 * preserve the original source spacing, which mixes poorly with
 * the fresh decls we inject — plain join keeps output uniform.
 */
function serializeStyle(root: Root): string {
  const parts: string[] = []
  root.walkDecls((d) => {
    parts.push(`${d.prop}: ${d.value}${d.important ? ' !important' : ''}`)
  })
  return parts.join('; ')
}

function firstDeclValue(root: Root, prop: string): string | undefined {
  let found: string | undefined
  root.walkDecls(prop, (d) => {
    found = d.value
    return false
  })
  return found
}

/**
 * Find the user-set `min-width:` value on a column. Juice keeps both ours
 * and the one inlined from a class like `min-w-1/3` — we skip any
 * min-width whose value still contains our placeholder token,
 * returning the first remaining user value, or null.
 */
function findUserMinWidth(root: Root): string | null {
  let userVal: string | null = null
  root.walkDecls('min-width', (d) => {
    if (!d.value.includes('__MAIZZLE_COLW_')) {
      userVal = d.value
      return false
    }
  })
  return userVal
}

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

function subtractInsetPx(width: string, insetPx: number): string {
  if (insetPx <= 0) return width
  const m = width.match(/^([\d.]+)(px|%)$/)
  if (!m) return width
  // Don't subtract px from percentage widths — units don't match.
  if (m[2] === '%') return width
  const n = parseFloat(m[1]) - insetPx
  return `${Math.max(0, Math.round(n))}px`
}

/**
 * Return the smaller of two px lengths. Clamps our count-based min-width
 * down to the user's `max-width:` so the cap is never silently
 * violated when our computed min would exceed the user's max.
 */
function minPxLength(a: string, b: string): string {
  const am = a.match(/^([\d.]+)px$/)
  const bm = b.match(/^([\d.]+)px$/)
  if (!am || !bm) return a
  return parseFloat(am[1]) < parseFloat(bm[1]) ? a : b
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

function readWidthFromRoot(root: Root): string | null {
  const raw = firstDeclValue(root, 'max-width')
    ?? firstDeclValue(root, 'width')
    ?? firstDeclValue(root, 'min-width')
  return raw ? resolveLength(raw) : null
}

function readHeightFromRoot(root: Root): string | null {
  const raw = firstDeclValue(root, 'max-height')
    ?? firstDeclValue(root, 'height')
    ?? firstDeclValue(root, 'min-height')
  return raw ? resolveLength(raw) : null
}

function readWidthSource(el: Element, root: Root | null): string | null {
  const explicit = el.attribs?.['data-maizzle-cw']
  if (explicit) {
    const r = resolveLength(explicit)
    if (r) return r
  }
  return root ? readWidthFromRoot(root) : null
}

/**
 * Convert a user-supplied length to absolute px against the column's source
 * width (post-inset). Percentages multiply against the source while
 * absolute units pass through `resolveLength`. Returns null when
 * the value or source can't be expressed in px.
 */
function userValueToPx(rawValue: string, sourcePx: string | null): string | null {
  const trimmed = rawValue.trim()

  const absMatch = trimmed.match(/^([\d.]+)(px|rem|em|pt)$/i)
  if (absMatch) return resolveLength(trimmed)

  const pctMatch = trimmed.match(/^([\d.]+)%$/)
  if (!pctMatch || !sourcePx) return null
  const sourceMatch = sourcePx.match(/^([\d.]+)px$/)
  if (!sourceMatch) return null
  const pct = parseFloat(pctMatch[1])
  const src = parseFloat(sourceMatch[1])
  return `${Math.round((pct / 100) * src)}px`
}

/**
 * Resolve `__MAIZZLE_COLW_{id}__` and `__MAIZZLE_OH_{id}__` placeholders.
 *
 * COLW (column width) — emitted by `<Column>` and `<Overlap>`. Walks up to
 * the nearest ancestor marked `data-maizzle-cw` (Container, Section,
 * Row, or another Column already resolved) and divides the source
 * width by `data-maizzle-cw-count`. With `data-maizzle-cw-self`,
 * reads from the element's own inlined max/width/min-width
 * instead — used by `<Overlap>` with its own width class.
 *
 * OH (overlap height) — emitted by `<Overlap>`. Reads max-height, height,
 * or min-height from the element's own inlined style.
 *
 * Resolution rules:
 * - Style placeholders for `min-width`: replaced when resolvable, otherwise
 *   the entire `min-width` declaration is stripped.
 * - Other style placeholders (Overlap td `width`, etc.): replaced when
 *   resolvable, otherwise replaced with the count-based fallback or `100%`.
 * - Comment placeholders: same fallback chain.
 *
 * Resolved column widths are written back to `data-maizzle-cw` so nested
 * rows cascade. All `data-maizzle-cw*` and `data-maizzle-oh-*` are
 * stripped at the end of the second walk pass.
 */
export function columnWidth(dom: ChildNode[]): ChildNode[] {
  /**
   * Cache parsed style ASTs for this columnWidth invocation. The walk-up
   * loop visits the same Section/Container once per column of a Row,
   * so without caching each column re-parses every ancestor's style.
   * Cache is function-local — no cross-build leak via the WeakMap.
   */
  const styleCache = new WeakMap<Element, Root>()
  const parseElStyle = (el: Element): Root => {
    const cached = styleCache.get(el)
    if (cached) return cached
    const style = el.attribs?.style ?? ''
    const root = style ? safeParser(style) : postcss.root()
    styleCache.set(el, root)
    return root
  }

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
  /**
   * Column ids whose absolute user `width:` was promoted to `min-width:`
   * — the original `width:` declaration must be stripped from the
   * column's style (otherwise it'd compete with the min-width).
   */
  const stripWidth = new Set<string>()
  /**
   * Column ids where the user wrote a percentage `width:` (e.g. `w-1/2`) —
   * explicit opt-out of px-based stacking. Keep the user's `width: X%`
   * and drop our `min-width:` placeholder so the column stays at
   * that percentage of its parent forever and never stacks.
   */
  const dropMinWidth = new Set<string>()
  /**
   * Column ids where the user wrote their own `min-width:` (via `min-w-1/3`).
   * Juice inlines theirs after ours, so two `min-width:` decls land in
   * the style — we strip the user's after using its value as the
   * column's resolution, leaving our placeholder as last word.
   */
  const stripUserMinWidth = new Set<string>()
  /**
   * Column ids where the user already supplied a `max-width:` of their own.
   * Our default `max-width: 100%` would just be shadowed by it via
   * last-wins and bloat the style — so we skip emitting it.
   */
  const userHasMaxWidth = new Set<string>()
  /**
   * Horizontal padding+border (px) of each column whose width was auto-
   * derived from count-based math. The column's own border/padding eats
   * its content box under content-box sizing, so the emitted `width:`
   * must be the slice MINUS this inset; otherwise two bordered cols
   * sum past the container and wrap. Only populated for auto paths
   * — user-explicit `width:`/`min-width:`/`max-width:`-wins paths
   * leave the value alone so the user's number stays the user's.
   */
  const autoColumnInsets = new Map<string, number>()
  /**
   * Extra inline-style decls that get stamped onto each column's MSO `<td>`
   * via its COLTDX placeholder. Carries `background-color` (so Word
   * paints the cell behind any padding area or whitespace, not just
   * the div) and hoisted `padding*` decls (when no border is present
   * — without one Word silently drops div padding, with one a td
   * copy would double-pad). The div keeps both for modern clients
   * since the MSO td is conditional-comment-only.
   */
  const tdExtras = new Map<string, string>()
  /**
   * MSO td width override for hoisted columns. With padding on the td and
   * CSS content-box sizing for table cells, td_outer = width + 2*pad,
   * so we set td width to the slot MINUS 2*horizontal-padding to keep
   * the cell at its outer slot. Skipped when the slot is a %.
   */
  const hoistedTdWidths = new Map<string, string>()

  for (const { id, count } of columns) {
    widthFallbacks.set(id, `${Math.round(100 / Math.max(count, 1))}%`)
  }

  for (const { el, id, count, self } of columns) {
    const ownRoot = parseElStyle(el)

    let sourceWidth: string | null = null
    let accumulatedInsetPx = 0

    if (self) {
      sourceWidth = readWidthFromRoot(ownRoot)
      accumulatedInsetPx = horizontalPaddingPx(ownRoot) + horizontalBorderPx(ownRoot)
    }
    else {
      /**
       * Walk up through every ancestor with attribs, accumulating horizontal
       * padding+border along the way (including the source). Stop at the
       * first `data-maizzle-cw` ancestor whose width is resolvable.
       * Markers without a resolvable width (Row emitted empty after
       * Tailwind dropped a bogus class) shouldn't shadow a real
       * width on a higher ancestor like `<Container>`.
       *
       * With CSS content-box this is technically generous toward the
       * source's own padding/border, but matches user expectations
       * when they put `px-9` or `border-2` on a wrapper.
       */
      let cur: ParentNode | null = el.parent
      while (cur) {
        const parentEl = cur as Element
        if (parentEl.attribs) {
          let pRoot: Root | null = null
          if (parentEl.attribs.style) {
            pRoot = parseElStyle(parentEl)
            accumulatedInsetPx += horizontalPaddingPx(pRoot) + horizontalBorderPx(pRoot)
          }
          if ('data-maizzle-cw' in parentEl.attribs) {
            const w = readWidthSource(parentEl, pRoot)
            if (w) {
              sourceWidth = w
              break
            }
          }
        }
        cur = (cur as any).parent ?? null
      }
    }

    const adjusted = sourceWidth ? subtractInsetPx(sourceWidth, accumulatedInsetPx) : null
    const countBased = adjusted ? divideLength(adjusted, count) : null

    /**
     * Four user-override paths, decided by which CSS property the user
     * actually wrote:
     *
     *   - `min-width: X` → user's value wins. Convert to px against
     *                     the source (if %), use as the column's
     *                     resolution, and strip the user's min-width
     *                     declaration so our placeholder substitution
     *                     remains the last `min-width:` in style.
     *   - `width: X%`   → opt-out of px stacking. Keep `width:` in
     *                     style, drop our `min-width:` placeholder.
     *                     Cols stay at X% of parent forever, never stack.
     *   - `width: Xpx` (or rem/em/pt) → fixed pixel column. Promote to
     *                     `min-width:`, strip the original `width:` so
     *                     it doesn't compete.
     *   - `max-width: X` → CSS cap. Keep the `max-width:` declaration;
     *                     clamp our count-based min-width *down* to
     *                     the user's max-width when our min would
     *                     otherwise violate it.
     */
    const userMinRaw = findUserMinWidth(ownRoot)
    const widthRaw = firstDeclValue(ownRoot, 'width')
    const maxRaw = firstDeclValue(ownRoot, 'max-width')

    if (userMinRaw) {
      const minPx = userValueToPx(userMinRaw, adjusted) ?? resolveLength(userMinRaw)
      if (minPx) {
        widthResolutions.set(id, minPx)
        el.attribs['data-maizzle-cw'] = minPx
        stripUserMinWidth.add(id)
        continue
      }
    }

    if (widthRaw) {
      const widthVal = resolveLength(widthRaw)
      if (widthVal?.endsWith('%')) {
        widthResolutions.set(id, widthVal)
        el.attribs['data-maizzle-cw'] = widthVal
        dropMinWidth.add(id)
        continue
      }
      if (widthVal) {
        widthResolutions.set(id, widthVal)
        el.attribs['data-maizzle-cw'] = widthVal
        stripWidth.add(id)
        continue
      }
    }

    if (maxRaw && countBased) {
      const maxPx = userValueToPx(maxRaw, adjusted)
      if (maxPx) {
        const cappedMin = countBased.endsWith('px')
          ? minPxLength(countBased, maxPx)
          : maxPx
        widthResolutions.set(id, cappedMin)
        el.attribs['data-maizzle-cw'] = cappedMin
        userHasMaxWidth.add(id)
        if (cappedMin === countBased) {
          const ownInset = horizontalPaddingPx(ownRoot) + horizontalBorderPx(ownRoot)
          if (ownInset > 0) autoColumnInsets.set(id, ownInset)
        }
        continue
      }
    }

    if (countBased) {
      widthResolutions.set(id, countBased)
      el.attribs['data-maizzle-cw'] = countBased
      const ownPaddingPx = horizontalPaddingPx(ownRoot)
      const ownBorderPx = horizontalBorderPx(ownRoot)
      const ownInset = ownPaddingPx + ownBorderPx
      if (ownInset > 0) autoColumnInsets.set(id, ownInset)

      /**
       * Build the MSO td's "extras" string — decls that need to live on
       * the td in addition to width + vertical-align. Two contributors:
       *
       *   - `background-color` (always, when present) — Word renders the
       *     div bg inside the cell, but anything outside the div (the
       *     td's padding area when hoisted, or any whitespace gap)
       *     would show the parent's bg instead of the column's. Painting
       *     the td matches the user's intent.
       *
       *   - `padding*` (hoisted only when no horizontal border) — Word
       *     drops div padding without a stabilizing border, so the td
       *     has to carry it. With a border, Word renders div padding
       *     and a td copy would double-pad. Skip when the slot is `%`:
       *     td width math can't subtract px padding from a percentage.
       */
      const extras: string[] = []
      let bgColor: string | undefined
      ownRoot.walkDecls('background-color', (d) => { bgColor = d.value })
      if (bgColor) extras.push(`background-color: ${bgColor}`)

      if (ownPaddingPx > 0 && ownBorderPx === 0 && countBased.endsWith('px')) {
        ownRoot.walkDecls((d) => {
          if (/^padding(-|$)/.test(d.prop)) extras.push(`${d.prop}: ${d.value}`)
        })
        hoistedTdWidths.set(id, subtractInsetPx(countBased, ownPaddingPx))
      }

      if (extras.length) tdExtras.set(id, extras.join('; '))
    }
  }

  const heightResolutions = new Map<string, string>()
  for (const { el, id } of heightTargets) {
    if (!el.attribs?.style) continue
    const h = readHeightFromRoot(parseElStyle(el))
    if (h) heightResolutions.set(id, h)
  }

  walk(dom, (node) => {
    if (node.type === 'comment') {
      const data = (node as any).data as string
      if (!data) return
      const hasCW = data.includes('__MAIZZLE_COLW_')
      const hasOH = data.includes('__MAIZZLE_OH_')
      const hasTDX = data.includes('__MAIZZLE_COLTDX_')
      if (!hasCW && !hasOH && !hasTDX) return
      ;(node as any).data = data
        .replace(/__MAIZZLE_COLW_([^_]+)__/g,
          (_m, mid) => hoistedTdWidths.get(mid) ?? widthResolutions.get(mid) ?? widthFallbacks.get(mid) ?? '100%')
        .replace(/;\s*__MAIZZLE_COLTDX_([^_]+)__/g,
          (_m, mid) => {
            const pad = tdExtras.get(mid)
            return pad ? `; ${pad}` : ''
          })
        .replace(/__MAIZZLE_OH_([^_]+)__/g,
          (_m, hid) => heightResolutions.get(hid) ?? '100%')
      return
    }

    const el = node as Element
    if (!el.attribs) return

    const style = el.attribs.style
    if (style && (style.includes('__MAIZZLE_COLW_') || style.includes('__MAIZZLE_OH_'))) {
      const root = parseElStyle(el)
      const cwId = el.attribs['data-maizzle-cw-id']

      /**
       * Strip user dups BEFORE substitution — last-wins CSS would
       * otherwise shadow our resolved values in the output.
       */
      if (cwId && stripUserMinWidth.has(cwId)) {
        root.walkDecls('min-width', (d) => {
          if (!d.value.includes('__MAIZZLE_COLW_')) d.remove()
        })
      }
      if (cwId && stripWidth.has(cwId)) {
        root.walkDecls('width', (d) => { d.remove() })
      }

      /**
       * Substitute the column's `min-width:` placeholder with `width: <res>;
       * max-width: 100%`. Width gives the same stacking trigger as
       * min-width — inline-block wraps when children sum > parent
       * — and the `max-width: 100%` clamp keeps the column from
       * overflowing the viewport once it drops to its own row on
       * mobile. Skip the clamp when the user supplied their own.
       *
       * Other placeholders (Overlap td `width`, comment markers,
       * OH height) get a plain value substitution.
       */
      root.walkDecls((d) => {
        if (d.prop === 'min-width') {
          const m = d.value.match(/^__MAIZZLE_COLW_([^_]+)__$/)
          if (m) {
            const mid = m[1]
            if (dropMinWidth.has(mid) || !widthResolutions.has(mid)) {
              d.remove()
              return
            }
            let resolved = widthResolutions.get(mid)!
            const inset = autoColumnInsets.get(mid)
            if (inset) resolved = subtractInsetPx(resolved, inset)
            const repl: Declaration[] = [postcss.decl({ prop: 'width', value: resolved })]
            if (!userHasMaxWidth.has(mid)) {
              repl.push(postcss.decl({ prop: 'max-width', value: '100%' }))
            }
            d.replaceWith(...repl)
            return
          }
        }
        if (d.value.includes('__MAIZZLE_COLW_') || d.value.includes('__MAIZZLE_OH_')) {
          d.value = d.value
            .replace(/__MAIZZLE_COLW_([^_]+)__/g,
              (_m, mid) => widthResolutions.get(mid) ?? widthFallbacks.get(mid) ?? '100%')
            .replace(/__MAIZZLE_OH_([^_]+)__/g,
              (_m, hid) => heightResolutions.get(hid) ?? '100%')
        }
      })

      const out = serializeStyle(root)
      if (out) el.attribs.style = out
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

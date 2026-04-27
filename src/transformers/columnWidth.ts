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

const RE_PADDING = /(?:^|;\s*)padding\s*:\s*([^;]+)/i
const RE_PADDING_LEFT = /(?:^|;\s*)padding-left\s*:\s*([^;]+)/i
const RE_PADDING_RIGHT = /(?:^|;\s*)padding-right\s*:\s*([^;]+)/i
const RE_BORDER = /(?:^|;\s*)border\s*:\s*([^;]+)/i
const RE_BORDER_WIDTH = /(?:^|;\s*)border-width\s*:\s*([^;]+)/i
const RE_BORDER_LEFT = /(?:^|;\s*)border-left\s*:\s*([^;]+)/i
const RE_BORDER_RIGHT = /(?:^|;\s*)border-right\s*:\s*([^;]+)/i
const RE_BORDER_LEFT_WIDTH = /(?:^|;\s*)border-left-width\s*:\s*([^;]+)/i
const RE_BORDER_RIGHT_WIDTH = /(?:^|;\s*)border-right-width\s*:\s*([^;]+)/i
const RE_BORDER_STYLE = /(?:^|;\s*)border-style\s*:\s*([^;]+)/i
const RE_BORDER_LEFT_STYLE = /(?:^|;\s*)border-left-style\s*:\s*([^;]+)/i
const RE_BORDER_RIGHT_STYLE = /(?:^|;\s*)border-right-style\s*:\s*([^;]+)/i

function lengthToPx(value: string): number | null {
  const m = value.trim().match(/^([\d.]+)(px|rem|em|pt)?$/i)
  if (!m) return null
  const n = parseFloat(m[1])
  switch ((m[2] || 'px').toLowerCase()) {
    case 'px': return n
    case 'rem':
    case 'em': return n * 16
    case 'pt': return n * 1.333
    default: return null
  }
}

/**
 * Read horizontal padding (left + right) from an element's inlined style.
 * Returns total px or 0 when none / unresolvable. Percentage padding is
 * skipped (would require resolving against an unknown containing block).
 */
function getHorizontalPaddingPx(el: Element): number {
  const style = el.attribs?.style
  if (!style) return 0

  const longhandLeft = style.match(RE_PADDING_LEFT)?.[1]?.trim()
  const longhandRight = style.match(RE_PADDING_RIGHT)?.[1]?.trim()

  let left: number | null = null
  let right: number | null = null

  // Shorthand applies first; longhand overrides per side.
  const shorthand = style.match(RE_PADDING)?.[1]?.trim()
  if (shorthand) {
    const parts = shorthand.split(/\s+/)
    // padding: T R B L | T RL B | TB RL | all
    let l: string | undefined
    let r: string | undefined
    switch (parts.length) {
      case 1: l = r = parts[0]; break
      case 2: l = r = parts[1]; break
      case 3: l = r = parts[1]; break
      case 4: r = parts[1]; l = parts[3]; break
    }
    if (l) left = lengthToPx(l)
    if (r) right = lengthToPx(r)
  }

  if (longhandLeft) left = lengthToPx(longhandLeft)
  if (longhandRight) right = lengthToPx(longhandRight)

  return (left ?? 0) + (right ?? 0)
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

const NO_BORDER_STYLES = new Set(['none', 'hidden'])

/**
 * Extract a px length from a CSS shorthand value (e.g. `1px solid red` → 1).
 * Returns null when no length token is present or when the style component
 * indicates no border (`none` / `hidden`). The shorthand defaults to medium
 * (3px) if a width is omitted but a visible style is set — we follow that.
 */
function shorthandBorderWidthPx(value: string): number | null {
  const trimmed = value.trim()
  const tokens = trimmed.split(/\s+/)

  // Detect explicit "no border" shorthands.
  for (const t of tokens) {
    if (NO_BORDER_STYLES.has(t.toLowerCase())) return null
  }

  for (const t of tokens) {
    const px = lengthToPx(t)
    if (px != null) return px
  }

  // Shorthand has a visible style but no explicit width → medium (3px).
  return 3
}

/**
 * Read horizontal border widths (left + right) from an element's inlined
 * style. Returns total px or 0 when none / unresolvable. Honors `border-style:
 * none|hidden` overrides per side.
 */
function getHorizontalBorderPx(el: Element): number {
  const style = el.attribs?.style
  if (!style) return 0

  let left: number | null = null
  let right: number | null = null
  let leftStyleNone = false
  let rightStyleNone = false

  // Generic shorthand `border: ...` applies to all four sides first.
  const borderShorthand = style.match(RE_BORDER)?.[1]
  if (borderShorthand) {
    const w = shorthandBorderWidthPx(borderShorthand)
    if (w == null) {
      leftStyleNone = rightStyleNone = true
    }
    else {
      left = right = w
    }
  }

  // `border-width: T R B L | T RL B | TB RL | all` overrides widths.
  const widthShorthand = style.match(RE_BORDER_WIDTH)?.[1]?.trim()
  if (widthShorthand) {
    const parts = widthShorthand.split(/\s+/)
    let l: string | undefined
    let r: string | undefined
    switch (parts.length) {
      case 1: l = r = parts[0]; break
      case 2: l = r = parts[1]; break
      case 3: l = r = parts[1]; break
      case 4: r = parts[1]; l = parts[3]; break
    }
    if (l) left = lengthToPx(l) ?? left
    if (r) right = lengthToPx(r) ?? right
  }

  // `border-style: T R B L | ...` — `none|hidden` zeroes that side.
  const styleShorthand = style.match(RE_BORDER_STYLE)?.[1]?.trim()
  if (styleShorthand) {
    const parts = styleShorthand.split(/\s+/)
    let l: string | undefined
    let r: string | undefined
    switch (parts.length) {
      case 1: l = r = parts[0]; break
      case 2: l = r = parts[1]; break
      case 3: l = r = parts[1]; break
      case 4: r = parts[1]; l = parts[3]; break
    }
    if (l && NO_BORDER_STYLES.has(l.toLowerCase())) leftStyleNone = true
    if (r && NO_BORDER_STYLES.has(r.toLowerCase())) rightStyleNone = true
  }

  // Per-side shorthands and width longhands override the above.
  const borderLeft = style.match(RE_BORDER_LEFT)?.[1]
  if (borderLeft) {
    const w = shorthandBorderWidthPx(borderLeft)
    if (w == null) leftStyleNone = true
    else { left = w; leftStyleNone = false }
  }
  const borderRight = style.match(RE_BORDER_RIGHT)?.[1]
  if (borderRight) {
    const w = shorthandBorderWidthPx(borderRight)
    if (w == null) rightStyleNone = true
    else { right = w; rightStyleNone = false }
  }

  const leftWidth = style.match(RE_BORDER_LEFT_WIDTH)?.[1]
  if (leftWidth) left = lengthToPx(leftWidth.trim()) ?? left
  const rightWidth = style.match(RE_BORDER_RIGHT_WIDTH)?.[1]
  if (rightWidth) right = lengthToPx(rightWidth.trim()) ?? right

  const leftStyle = style.match(RE_BORDER_LEFT_STYLE)?.[1]
  if (leftStyle && NO_BORDER_STYLES.has(leftStyle.trim().toLowerCase())) leftStyleNone = true
  const rightStyle = style.match(RE_BORDER_RIGHT_STYLE)?.[1]
  if (rightStyle && NO_BORDER_STYLES.has(rightStyle.trim().toLowerCase())) rightStyleNone = true

  return (leftStyleNone ? 0 : (left ?? 0)) + (rightStyleNone ? 0 : (right ?? 0))
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

/**
 * Convert a user-supplied length to absolute px against the column's
 * resolved source width (post-inset). Percentages multiply against the
 * source; absolute units (px/rem/em/pt) pass through `resolveLength`.
 * Returns null when the value or source can't be expressed in px.
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
 * Find the user-set `min-width:` value in an inlined style. Juice keeps
 * both our placeholder declaration and the one inlined from a class
 * like `min-w-1/3`, so we filter out any `min-width:` whose value
 * contains our placeholder token. Returns the raw value (e.g. `33.33%`,
 * `200px`) or null when the user didn't add their own.
 */
function findUserMinWidth(style: string): string | null {
  const matches = [...style.matchAll(/(?:^|;)\s*min-width\s*:\s*([^;]+)/gi)]
  for (const m of matches) {
    const v = m[1].trim()
    if (!v.includes('__MAIZZLE_COLW_')) return v
  }
  return null
}

/**
 * Return the smaller of two px lengths (e.g. `288px`, `192px`). Used to
 * cap our count-based min-width down to the user's `max-width:` so the
 * cap is never silently violated when min > max. Returns `a` unchanged
 * when either value isn't a parseable px length.
 */
function minPxLength(a: string, b: string): string {
  const am = a.match(/^([\d.]+)px$/)
  const bm = b.match(/^([\d.]+)px$/)
  if (!am || !bm) return a
  return parseFloat(am[1]) < parseFloat(bm[1]) ? a : b
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
  /**
   * Column ids whose absolute user `width:` was promoted to `min-width:`
   * — the original `width:` declaration must be stripped from the
   * column's style (otherwise it'd compete with the min-width and CSS
   * spec would have width win at the column's chosen px size, defeating
   * the natural mobile stacking we get from a tall min-width).
   */
  const stripWidth = new Set<string>()
  /**
   * Column ids where the user wrote a percentage `width:` (e.g. `w-1/2`)
   * — that's an explicit opt-out of the px-based stacking model. Keep
   * the user's `width: X%` and drop our `min-width:` placeholder so the
   * column always sits at that percentage of its parent and never stacks.
   */
  const dropMinWidth = new Set<string>()
  /**
   * Column ids where the user wrote their own `min-width:` (e.g. via
   * `min-w-1/3`). Juice inlines theirs after ours, so two `min-width:`
   * declarations end up in the style; we strip the user's after using
   * its value as the column's resolution, so our placeholder remains
   * the last word.
   */
  const stripUserMinWidth = new Set<string>()
  /**
   * Column ids where the user already supplied a `max-width:` of their
   * own — our default `max-width: 100%` would just be shadowed by it
   * (last wins) and bloat the style attribute, so skip emitting it.
   */
  const userHasMaxWidth = new Set<string>()

  for (const { id, count } of columns) {
    widthFallbacks.set(id, `${Math.round(100 / Math.max(count, 1))}%`)
  }

  for (const { el, id, count, self } of columns) {
    let sourceWidth: string | null = null

    let accumulatedInsetPx = 0

    if (self) {
      sourceWidth = readWidthFromStyle(el)
      accumulatedInsetPx = getHorizontalPaddingPx(el) + getHorizontalBorderPx(el)
    } else {
      // Walk up through every `data-maizzle-cw` ancestor until one yields a
      // resolvable width. A marker with no resolvable width (e.g. Row got an
      // unrecognized class like `w-typo` and emitted an empty marker) shouldn't
      // shadow a real width on a higher ancestor like `<Container>`.
      //
      // Along the way, accumulate horizontal padding + border (left + right)
      // from every ancestor — including the source. Subtracting them before
      // dividing gives email-developer-intuitive sizing: "padding/border
      // contain content". With CSS content-box this is technically generous
      // toward the source's own padding/border, but matches what users expect
      // when they put `px-9` or `border-2` on a wrapper.
      let cur: ParentNode | null = el.parent
      while (cur) {
        const parentEl = cur as Element
        if (parentEl.attribs) {
          accumulatedInsetPx += getHorizontalPaddingPx(parentEl) + getHorizontalBorderPx(parentEl)
          if ('data-maizzle-cw' in parentEl.attribs) {
            const w = readWidthSource(parentEl)
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
    const style = el.attribs?.style ?? ''
    const userMinRaw = findUserMinWidth(style)
    const widthRaw = style.match(RE_WIDTH)?.[1]
    const maxRaw = style.match(RE_MAX_WIDTH)?.[1]

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
        continue
      }
    }

    if (countBased) {
      widthResolutions.set(id, countBased)
      el.attribs['data-maizzle-cw'] = countBased
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
      let next = style
      const cwId = el.attribs['data-maizzle-cw-id']

      /**
       * Strip user-set declarations BEFORE substitution:
       *  - their `min-width:` (the one without our placeholder token)
       *    would override our resolved declaration via "last wins";
       *  - their absolute `width:` would compete with the `width:` we're
       *    about to emit and the duplicates would just bloat the style.
       */
      if (cwId && stripUserMinWidth.has(cwId)) {
        next = next.replace(
          /(^|;\s*)min-width\s*:\s*([^;]+)/gi,
          (m, _prefix, val) => val.includes('__MAIZZLE_COLW_') ? m : '',
        )
      }
      if (cwId && stripWidth.has(cwId)) {
        next = next.replace(/(^|;\s*)width\s*:\s*[^;]+/gi, '')
      }

      /**
       * Swap the column's `min-width:` placeholder for `width: <res>;
       * max-width: 100%`. Width gives the same stacking trigger as
       * min-width (inline-block wraps when sum > parent), and the
       * max-width: 100% clamp keeps the column from overflowing the
       * viewport once it drops to its own row on mobile. Skip the
       * `max-width: 100%` clamp when the user already supplied their
       * own `max-width:` — last-wins would shadow ours anyway.
       */
      next = next.replace(
        /(^|;\s*)min-width:\s*__MAIZZLE_COLW_([^_]+)__/g,
        (_m, prefix, mid) => {
          if (dropMinWidth.has(mid)) return ''
          if (!widthResolutions.has(mid)) return ''
          const decl = userHasMaxWidth.has(mid)
            ? `width: ${widthResolutions.get(mid)}`
            : `width: ${widthResolutions.get(mid)}; max-width: 100%`
          return `${prefix}${decl}`
        },
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

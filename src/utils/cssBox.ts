import type { Root } from 'postcss'

export const NO_BORDER_STYLES = new Set(['none', 'hidden'])

/**
 * Parse a length token into px. Handles `Npx`, `Nrem`, `Nem`, `Npt`, and
 * unitless N (treated as px). Returns null for percentages, calc(),
 * keywords, or anything that doesn't reduce to a concrete length.
 */
export function lengthToPx(value: string): number | null {
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
 * Expand a 1-4 token CSS shorthand (T R B L) into a left/right pair:
 *   1: all sides
 *   2: TB RL
 *   3: T RL B
 *   4: T R B L
 */
export function shorthandSides(value: string): { left?: string; right?: string } {
  const parts = value.trim().split(/\s+/)
  switch (parts.length) {
    case 1: return { left: parts[0], right: parts[0] }
    case 2:
    case 3: return { left: parts[1], right: parts[1] }
    case 4: return { left: parts[3], right: parts[1] }
    default: return {}
  }
}

/**
 * Read horizontal padding (left + right) px from a parsed style root.
 * Percentages are skipped since they'd need a known container width.
 */
export function horizontalPaddingPx(root: Root): number {
  let left: number | null = null
  let right: number | null = null

  root.walkDecls((d) => {
    switch (d.prop) {
      case 'padding': {
        const { left: l, right: r } = shorthandSides(d.value)
        if (l) left = lengthToPx(l)
        if (r) right = lengthToPx(r)
        break
      }
      case 'padding-left':
        left = lengthToPx(d.value)
        break
      case 'padding-right':
        right = lengthToPx(d.value)
        break
    }
  })

  return (left ?? 0) + (right ?? 0)
}

/**
 * Extract a px length from a CSS border shorthand (e.g. `1px solid red` → 1).
 * Returns null when the value indicates no border (`none` or `hidden`).
 * Defaults to 3px (CSS `medium`) when a visible style is set but no
 * explicit width token is present in the shorthand value.
 */
export function shorthandBorderWidthPx(value: string): number | null {
  const tokens = value.trim().split(/\s+/)
  if (tokens.some((t) => NO_BORDER_STYLES.has(t.toLowerCase()))) return null
  for (const t of tokens) {
    const px = lengthToPx(t)
    if (px != null) return px
  }
  return 3
}

/**
 * Read horizontal border widths (left + right) px from a parsed style root.
 * Per-side `border-style: none|hidden` overrides count as zero
 * contribution. Returns total px or 0 when nothing resolves.
 */
export function horizontalBorderPx(root: Root): number {
  let left: number | null = null
  let right: number | null = null
  let leftNone = false
  let rightNone = false

  root.walkDecls((d) => {
    switch (d.prop) {
      case 'border': {
        const w = shorthandBorderWidthPx(d.value)
        if (w == null) {
          leftNone = rightNone = true
        }
        else {
          left = right = w
          leftNone = rightNone = false
        }
        break
      }
      case 'border-width': {
        const { left: l, right: r } = shorthandSides(d.value)
        if (l) left = lengthToPx(l) ?? left
        if (r) right = lengthToPx(r) ?? right
        break
      }
      case 'border-style': {
        const { left: l, right: r } = shorthandSides(d.value)
        if (l && NO_BORDER_STYLES.has(l.toLowerCase())) leftNone = true
        if (r && NO_BORDER_STYLES.has(r.toLowerCase())) rightNone = true
        break
      }
      case 'border-left': {
        const w = shorthandBorderWidthPx(d.value)
        if (w == null) leftNone = true
        else { left = w; leftNone = false }
        break
      }
      case 'border-right': {
        const w = shorthandBorderWidthPx(d.value)
        if (w == null) rightNone = true
        else { right = w; rightNone = false }
        break
      }
      case 'border-left-width':
        left = lengthToPx(d.value) ?? left
        break
      case 'border-right-width':
        right = lengthToPx(d.value) ?? right
        break
      case 'border-left-style':
        if (NO_BORDER_STYLES.has(d.value.trim().toLowerCase())) leftNone = true
        break
      case 'border-right-style':
        if (NO_BORDER_STYLES.has(d.value.trim().toLowerCase())) rightNone = true
        break
    }
  })

  return (leftNone ? 0 : (left ?? 0)) + (rightNone ? 0 : (right ?? 0))
}

export function normalizeToPixels(value: string | number): string {
  if (typeof value === 'number' || Number.isFinite(Number(value))) {
    return `${value}px`
  }
  return value
}

const counters: Record<string, number> = {}

/**
 * Module-scoped sequential ID generator. Used by components to mint
 * unique marker ids (e.g. `c1`, `c2`) for the post-render transformer.
 *
 * Must live here (not inside `<script setup>`) because Vue compiles
 * `<script setup>` into the component's `setup()` function — any
 * `let counter = 0` there resets per instance, causing id collisions.
 */
export function nextId(prefix: string): string {
  counters[prefix] = (counters[prefix] ?? 0) + 1
  return `${prefix}${counters[prefix]}`
}

export function hasWidthUtility(classStr: string): boolean {
  return classStr.split(/\s+/).some((c) => {
    const utility = c.split(':').pop() ?? ''
    const clean = utility.replace(/^!/, '')
    return /^(w-|max-w-|min-w-)/.test(clean)
  })
}

export function hasWidthInStyle(styleStr: string): boolean {
  return /(?:^|;\s*)(?:max-width|width)\s*:/i.test(styleStr)
}

export function hasHeightUtility(classStr: string): boolean {
  return classStr.split(/\s+/).some((c) => {
    const utility = c.split(':').pop() ?? ''
    const clean = utility.replace(/^!/, '')
    return /^(h-|max-h-|min-h-)/.test(clean)
  })
}

export function hasHeightInStyle(styleStr: string): boolean {
  return /(?:^|;\s*)(?:max-height|height)\s*:/i.test(styleStr)
}

/**
 * Shared prop for components that emit MSO/VML fallback markup. The
 * `null` default acts as the "unset" sentinel — `useOutlookFallback`
 * treats `null` as inherit-from-ancestor (root default `true`),
 * letting users override per-component without losing inheritance.
 */
export const outlookFallbackProp = {
  type: Boolean,
  default: null,
} as const


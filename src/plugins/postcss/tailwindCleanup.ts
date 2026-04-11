import postcss from 'postcss'
import type { MaizzleConfig } from '../../types/config.ts'

const DEFAULT_SELECTORS = [':host', ':lang']
const DEFAULT_AT_RULES = ['layer', 'property']

/**
 * Removes CSS rules whose every comma-separated selector part starts with
 * one of the configured prefixes (e.g. ':host', ':lang'). Rules with mixed
 * selectors have the unwanted parts stripped.
 *
 * Also removes entire at-rules by name (e.g. '@layer', '@property').
 *
 * Intended to clean up Tailwind's compiled output after lightningcss has
 * flattened all modern CSS syntax.
 */
export function tailwindCleanup(config: MaizzleConfig): postcss.Plugin[] {
  const selectors: string[] = config.postcss?.removeSelectors ?? DEFAULT_SELECTORS
  const atRules: string[] = config.postcss?.removeAtRules ?? DEFAULT_AT_RULES

  return [
    {
      postcssPlugin: 'tailwind-cleanup-selectors',
      Rule(rule) {
        const parts = rule.selector.split(',').map(s => s.trim())
        const kept = parts.filter(p => !selectors.some(s => p === s || p.startsWith(`${s}(`)))
        if (kept.length === 0) {
          rule.remove()
        } else if (kept.length < parts.length) {
          rule.selector = kept.join(', ')
        }
      },
    },
    {
      postcssPlugin: 'tailwind-cleanup-at-rules',
      AtRule(rule) {
        if (atRules.includes(rule.name)) {
          rule.remove()
        }
      },
    },
    {
      postcssPlugin: 'tailwind-cleanup-text-decoration',
      Declaration(decl) {
        if (decl.prop === 'text-decoration-line') {
          decl.prop = 'text-decoration'
        }
      },
    },
  ]
}

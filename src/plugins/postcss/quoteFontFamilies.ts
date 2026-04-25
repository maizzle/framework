import type { Plugin } from 'postcss'

const GENERIC_KEYWORDS = new Set([
  'serif', 'sans-serif', 'monospace', 'cursive', 'fantasy',
  'system-ui', 'ui-serif', 'ui-sans-serif', 'ui-monospace', 'ui-rounded',
  'emoji', 'math', 'fangsong',
  'inherit', 'initial', 'unset', 'revert', 'revert-layer',
])

/**
 * Split a font-family value on top-level commas only, preserving quoted
 * strings and parenthesised groups like `var(...)`.
 */
function splitFamilies(value: string): string[] {
  const parts: string[] = []
  let depth = 0
  let quote: string | null = null
  let start = 0

  for (let i = 0; i < value.length; i++) {
    const ch = value[i]
    if (quote) {
      if (ch === '\\') { i++; continue }
      if (ch === quote) quote = null
      continue
    }
    if (ch === '"' || ch === "'") {
      quote = ch
      continue
    }
    if (ch === '(') depth++
    else if (ch === ')') depth--
    else if (ch === ',' && depth === 0) {
      parts.push(value.slice(start, i).trim())
      start = i + 1
    }
  }

  parts.push(value.slice(start).trim())
  return parts.filter(Boolean)
}

/**
 * Re-quote multi-word font-family identifiers that lightningcss "optimised"
 * by removing quotes. CSS allows space-separated identifiers as a family
 * name, but Google Fonts (and most style guides) prescribe quoted form.
 */
export function quoteFontFamilies(): Plugin {
  return {
    postcssPlugin: 'quote-font-families',
    Declaration: {
      'font-family': (decl) => {
        const value = decl.value
        if (!value || !/\s/.test(value)) return

        const families = splitFamilies(value)
        let changed = false

        const fixed = families.map((token) => {
          if (token.startsWith('"') || token.startsWith("'")) return token
          if (token.startsWith('var(')) return token
          if (!token.includes(' ')) return token
          if (GENERIC_KEYWORDS.has(token.toLowerCase())) return token

          changed = true
          return `"${token}"`
        })

        if (changed) {
          decl.value = fixed.join(', ')
        }
      },
    },
  }
}

export const postcss = true

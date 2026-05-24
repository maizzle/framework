import { parse, converter, formatRgb } from 'culori'

const toLch = converter('lch')

type Mode = 'background' | 'foreground'

/**
 * CSS properties whose values contain colors we should invert, mapped to
 * the inversion mode. Kebab-case for <style> decls; inline styles
 * are handled via the same lookup after lowercasing.
 */
const styleProps = new Map<string, Mode>([
  ['background', 'background'],
  ['background-color', 'background'],
  ['border', 'foreground'],
  ['border-color', 'foreground'],
  ['border-top', 'foreground'],
  ['border-right', 'foreground'],
  ['border-bottom', 'foreground'],
  ['border-left', 'foreground'],
  ['border-top-color', 'foreground'],
  ['border-right-color', 'foreground'],
  ['border-bottom-color', 'foreground'],
  ['border-left-color', 'foreground'],
  ['color', 'foreground'],
  ['outline', 'foreground'],
  ['outline-color', 'foreground'],
])

// Hex | color function with balanced-enough parens | bare word (possible named color).
const COLOR_TOKEN = /#[a-f0-9]{3,8}\b|(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\([^)]*\)|\b[a-z]{3,20}\b/gi

// Words that look color-shaped but aren't — skip to avoid a wasted parse().
const NON_COLOR_KEYWORDS = /^(?:none|transparent|inherit|initial|unset|revert|currentcolor|auto|normal|solid|dashed|dotted|double|groove|ridge|inset|outset|hidden|thin|thick|medium|center|left|right|top|bottom|cover|contain|repeat|no-repeat|fixed|scroll|local|url|var|calc|linear|radial|conic|gradient)$/i

function invertOne(color: string, mode: Mode): string {
  try {
    const parsed = parse(color)
    if (!parsed) return color
    const lch = toLch(parsed) as any
    if (!lch || typeof lch.l !== 'number' || Number.isNaN(lch.l)) return color

    if (mode === 'background' && lch.l >= 50) lch.l = 50 - (lch.l - 50) * 0.75
    if (mode === 'foreground' && lch.l < 50)  lch.l = 50 - (lch.l - 50) * 0.75
    if (typeof lch.c === 'number' && !Number.isNaN(lch.c)) lch.c *= 0.8

    return formatRgb(lch) || color
  } catch {
    return color
  }
}

function invertValue(value: string, mode: Mode): string {
  return value.replace(COLOR_TOKEN, (tok) => {
    if (NON_COLOR_KEYWORDS.test(tok)) return tok
    if (!parse(tok)) return tok
    return invertOne(tok, mode)
  })
}

// Splits an inline style attr by `;` (safe — color functions use `,` not `;`).
function invertInlineStyle(style: string): string {
  return style.split(';').map((decl) => {
    const i = decl.indexOf(':')
    if (i === -1) return decl
    const prop = decl.slice(0, i).trim().toLowerCase()
    const mode = styleProps.get(prop)
    if (!mode) return decl
    return decl.slice(0, i + 1) + invertValue(decl.slice(i + 1), mode)
  }).join(';')
}

function invertStyleTag(css: string): string {
  try {
    const sheet = new CSSStyleSheet()
    sheet.replaceSync(css)
    const walk = (rules: CSSRuleList) => {
      for (const rule of Array.from(rules)) {
        if (rule instanceof CSSStyleRule) {
          const props = Array.from({ length: rule.style.length }, (_, i) => rule.style.item(i))
          for (const prop of props) {
            const mode = styleProps.get(prop.toLowerCase())
            if (!mode) continue
            const value = rule.style.getPropertyValue(prop)
            const priority = rule.style.getPropertyPriority(prop)
            rule.style.setProperty(prop, invertValue(value, mode), priority)
          }
        } else if ('cssRules' in rule) {
          walk((rule as CSSGroupingRule).cssRules)
        }
      }
    }
    walk(sheet.cssRules)
    return Array.from(sheet.cssRules).map(r => r.cssText).join('\n')
  } catch {
    return css
  }
}

const ORIG_INLINE = 'data-maizzle-orig-style'
const ORIG_STYLE_TAG = 'data-maizzle-orig-style-content'
const APPLIED_FLAG = 'data-maizzle-dark-applied'

function* walk(root: Node): Generator<Element> {
  if (root.nodeType === 1) yield root as Element
  for (const child of Array.from(root.childNodes)) yield* walk(child)
}

export function applyColorInversion(iframe: HTMLIFrameElement): void {
  const doc = iframe.contentDocument
  if (!doc || !doc.body || doc.body.hasAttribute(APPLIED_FLAG)) return

  for (const el of walk(doc.documentElement)) {
    const inline = el.getAttribute('style')
    if (inline) {
      el.setAttribute(ORIG_INLINE, inline)
      el.setAttribute('style', invertInlineStyle(inline))
    }
    if (el.tagName === 'STYLE') {
      const original = el.textContent ?? ''
      el.setAttribute(ORIG_STYLE_TAG, original)
      el.textContent = invertStyleTag(original)
    }
  }

  doc.body.setAttribute(APPLIED_FLAG, '')
}

export function undoColorInversion(iframe: HTMLIFrameElement): void {
  const doc = iframe.contentDocument
  if (!doc || !doc.body || !doc.body.hasAttribute(APPLIED_FLAG)) return

  for (const el of walk(doc.documentElement)) {
    const origInline = el.getAttribute(ORIG_INLINE)
    if (origInline !== null) {
      el.setAttribute('style', origInline)
      el.removeAttribute(ORIG_INLINE)
    }
    if (el.tagName === 'STYLE' && el.hasAttribute(ORIG_STYLE_TAG)) {
      el.textContent = el.getAttribute(ORIG_STYLE_TAG) ?? ''
      el.removeAttribute(ORIG_STYLE_TAG)
    }
  }

  doc.body.removeAttribute(APPLIED_FLAG)
}

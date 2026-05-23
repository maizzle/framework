import { describe, it, expect } from 'vitest'
import { safeSelectors } from '../../transformers/safeSelectors.ts'
import type { CssConfig } from '../../types/config.ts'

// Shorthand: run transformer with safe enabled by default so feature tests
// can stay concise. Pass an explicit value to test config behaviour.
function run(html: string, safe?: false | true | Record<string, string>): string {
  return safeSelectors(html, { safe: safe ?? true } satisfies CssConfig)
}

describe('safeSelectors — class attributes', () => {
  it('replaces : with - (Tailwind responsive/variant prefix)', () => {
    expect(run('<div class="sm:text-base"></div>')).toBe('<div class="sm-text-base"></div>')
  })

  it('replaces / with - (Tailwind fraction utilities)', () => {
    expect(run('<div class="w-1/2"></div>')).toBe('<div class="w-1-2"></div>')
  })

  it('replaces . with _ (decimal values)', () => {
    expect(run('<div class="w-2.5"></div>')).toBe('<div class="w-2_5"></div>')
  })

  it('replaces % with pc', () => {
    expect(run('<div class="w-[50%]"></div>')).toBe('<div class="w-50pc"></div>')
  })

  it('removes [ and ]', () => {
    expect(run('<div class="text-[14px]"></div>')).toBe('<div class="text-14px"></div>')
  })

  it('replaces ! with i- (Tailwind important modifier)', () => {
    expect(run('<div class="text-red-500!"></div>')).toBe('<div class="text-red-500-i"></div>')
  })

  it('replaces @ with at-', () => {
    expect(run('<div class="@sm:flex"></div>')).toBe('<div class="at-sm-flex"></div>')
  })

  it('replaces # with _', () => {
    expect(run('<div class="color-#fff"></div>')).toBe('<div class="color-_fff"></div>')
  })

  it('replaces & with and-', () => {
    expect(run('<div class="[&>span]:flex"></div>')).toBe('<div class="and-gt-span-flex"></div>')
  })

  it('handles multiple classes on the same element', () => {
    expect(run('<div class="sm:text-base hover:text-red-500 font-bold"></div>'))
      .toBe('<div class="sm-text-base hover-text-red-500 font-bold"></div>')
  })

  it('handles multiple special chars within one class', () => {
    // sm:w-1/2 → sm-w-1-2
    expect(run('<div class="sm:w-1/2"></div>')).toBe('<div class="sm-w-1-2"></div>')
  })

  it('leaves class names with no special chars unchanged', () => {
    const html = '<div class="font-bold text-red-500 p-4"></div>'
    expect(run(html)).toBe(html)
  })

  it('handles extra whitespace between classes gracefully', () => {
    expect(run('<div class="  sm:flex   md:block  "></div>'))
      .toBe('<div class="sm-flex md-block"></div>')
  })

  it('processes class attrs on nested elements', () => {
    expect(run('<table class="sm:w-full"><tr><td class="hover:bg-red-100">x</td></tr></table>'))
      .toBe('<table class="sm-w-full"><tr><td class="hover-bg-red-100">x</td></tr></table>')
  })
})

describe('safeSelectors — style tag selectors', () => {
  it('replaces \\: with - in CSS selectors', () => {
    const html = '<style>.sm\\:text-base { color: red; }</style>'
    expect(run(html)).toBe('<style>.sm-text-base { color: red; }</style>')
  })

  it('replaces \\/ with - in CSS selectors', () => {
    const html = '<style>.w-1\\/2 { width: 50%; }</style>'
    expect(run(html)).toBe('<style>.w-1-2 { width: 50%; }</style>')
  })

  it('replaces \\. with _ in CSS selectors', () => {
    const html = '<style>.w-2\\.5 { width: 2.5rem; }</style>'
    expect(run(html)).toBe('<style>.w-2_5 { width: 2.5rem; }</style>')
  })

  it('replaces \\[ and \\] in CSS selectors', () => {
    const html = '<style>.text-\\[14px\\] { font-size: 14px; }</style>'
    expect(run(html)).toBe('<style>.text-14px { font-size: 14px; }</style>')
  })

  it('replaces \\! with i- in CSS selectors', () => {
    const html = '<style>.font-bold\\! { font-weight: 700 !important; }</style>'
    expect(run(html)).toBe('<style>.font-bold-i { font-weight: 700 !important; }</style>')
  })

  it('handles multiple rules in one style tag', () => {
    const html = '<style>.sm\\:flex { display: flex; } .md\\:block { display: block; }</style>'
    expect(run(html)).toBe('<style>.sm-flex { display: flex; } .md-block { display: block; }</style>')
  })

  it('handles comma-separated selectors', () => {
    const html = '<style>.sm\\:flex, .md\\:block { color: red; }</style>'
    expect(run(html)).toBe('<style>.sm-flex, .md-block { color: red; }</style>')
  })

  it('preserves the standalone Yahoo Mail ".\\&" wrapper selector', () => {
    // Yahoo Mail wraps content in a class literally named `&`. Rewriting
    // `\&` to `and-` would break the rule because we can't rewrite Yahoo's
    // DOM. `\&` inside larger class names (Tailwind arbitrary variants)
    // must still be rewritten.
    const html = '<style>.\\& .yahoo\\:text-white { color: red; }</style>'
    expect(run(html)).toBe('<style>.\\& .yahoo-text-white { color: red; }</style>')
  })

  it('still rewrites \\& when part of a larger class name', () => {
    // Tailwind arbitrary variants like `[&>span]:flex` generate selectors
    // where `\&` is part of a bigger class — those must still be rewritten.
    const html = '<style>.\\[\\&\\>span\\]\\:flex > span { display: flex; }</style>'
    expect(run(html)).toContain('and-')
  })

  it('handles \\2c  (CSS unicode escape for comma) in selectors', () => {
    // \2c  is the CSS unicode escape for comma character
    const html = '<style>.item\\2c list { color: red; }</style>'
    expect(run(html)).toBe('<style>.item_list { color: red; }</style>')
  })

  it('does not modify property values inside rules', () => {
    const html = '<style>.sm\\:text-base { font-family: "Arial:Black", sans-serif; }</style>'
    const result = run(html)
    expect(result).toContain('.sm-text-base')
    expect(result).toContain('"Arial:Black"')
  })

  it('processes style and class attr together', () => {
    const html = '<style>.sm\\:text-base { color: red; }</style><div class="sm:text-base">x</div>'
    expect(run(html)).toBe('<style>.sm-text-base { color: red; }</style><div class="sm-text-base">x</div>')
  })
})

describe('safeSelectors — config: css.safe', () => {
  it('is enabled by default', () => {
    const html = '<div class="sm:text-base"></div>'
    expect(safeSelectors(html, {}))
      .toBe('<div class="sm-text-base"></div>')
  })

  it('is enabled when css.safe is true', () => {
    expect(run('<div class="sm:text-base"></div>', true))
      .toBe('<div class="sm-text-base"></div>')
  })

  it('is disabled when css.safe is false', () => {
    const html = '<div class="sm:text-base"></div>'
    expect(run(html, false)).toBe(html)
  })

  it('also skips style tags when disabled', () => {
    const html = '<style>.sm\\:text-base { color: red; }</style>'
    expect(run(html, false)).toBe(html)
  })

  it('merges custom replacements on top of defaults', () => {
    // Override : → _ instead of : → -
    const result = run('<div class="sm:text-base"></div>', { ':': '_' })
    expect(result).toBe('<div class="sm_text-base"></div>')
  })

  it('custom replacements do not remove other defaults', () => {
    // / still uses the default → - when only : is overridden
    const result = run('<div class="sm:w-1/2"></div>', { ':': '_' })
    expect(result).toBe('<div class="sm_w-1-2"></div>')
  })

  it('custom replacements apply to style selectors too', () => {
    const html = '<style>.sm\\:text-base { color: red; }</style>'
    const result = run(html, { ':': '_' })
    expect(result).toBe('<style>.sm_text-base { color: red; }</style>')
  })

  it('supports empty replacement (removes chars)', () => {
    // Default for [ is already '' — confirm removal
    expect(run('<div class="text-[14px]"></div>'))
      .toBe('<div class="text-14px"></div>')
  })
})

describe('safeSelectors — short-circuit behaviour', () => {
  it('returns the original string when there are no class attrs or style tags', () => {
    const html = '<div id="main"><p>Hello</p></div>'
    const result = run(html)
    // No modification was made — same string returned
    expect(result).toBe(html)
  })

  it('returns the original string when no class contains special chars', () => {
    const html = '<div class="font-bold text-red-500"></div>'
    const result = run(html)
    expect(result).toBe(html)
  })

  it('returns the original string when the style tag contains no rules', () => {
    const html = '<style>/* empty */</style>'
    const result = run(html)
    expect(result).toBe(html)
  })
})

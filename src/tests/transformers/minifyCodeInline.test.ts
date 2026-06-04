import { describe, it, expect } from 'vitest'
import { minifyCodeInline } from '../../transformers/minifyCodeInline.ts'

describe('minifyCodeInline', () => {
  it('decodes §MZLT§/§MZGT§ markers back to real angle brackets', () => {
    const input = '<code data-minify-inline>§MZLT§span§MZGT§hi§MZLT§/span§MZGT§</code>'
    expect(minifyCodeInline(input)).toBe('<code><span>hi</span></code>')
  })

  it('preserves source-level &lt;/&gt; entities (literal `<` `>` in user code) untouched', () => {
    /**
     * CodeInline only replaces real `<`/`>` (structural). Shiki's entities
     * for source-level chars are `&lt;`/`&gt;` strings (no real `<` inside),
     * so they pass through this transformer verbatim.
     */
    const input = '<code data-minify-inline>§MZLT§span§MZGT§&lt;§MZLT§/span§MZGT§</code>'
    expect(minifyCodeInline(input)).toBe('<code><span>&lt;</span></code>')
  })

  it('preserves shiki\'s class="line" wrapper through the decode', () => {
    const input = '<code data-minify-inline>§MZLT§span class="line"§MZGT§§MZLT§span style="color:#abc"§MZGT§&lt;§MZLT§/span§MZGT§§MZLT§/span§MZGT§</code>'
    const out = minifyCodeInline(input)
    expect(out).toContain('<span class="line">')
    expect(out).toContain('<span style="color:#abc">&lt;</span>')
  })

  it('strips the data-minify-inline attribute even with no markers in content', () => {
    const input = '<code data-minify-inline>x</code>'
    expect(minifyCodeInline(input)).toBe('<code>x</code>')
  })

  it('preserves other attributes when stripping the marker', () => {
    const input = '<code class="foo" data-minify-inline style="color:red">§MZLT§span§MZGT§x§MZLT§/span§MZGT§</code>'
    expect(minifyCodeInline(input)).toBe('<code class="foo" style="color:red"><span>x</span></code>')
  })

  it('handles the marker as the first attribute', () => {
    const input = '<code data-minify-inline class="foo">§MZLT§span§MZGT§x§MZLT§/span§MZGT§</code>'
    expect(minifyCodeInline(input)).toBe('<code class="foo"><span>x</span></code>')
  })

  it('trims formatter-injected leading/trailing whitespace inside the marker', () => {
    const input = '<code data-minify-inline>\n  §MZLT§span§MZGT§x§MZLT§/span§MZGT§\n</code>'
    expect(minifyCodeInline(input)).toBe('<code><span>x</span></code>')
  })

  it('preserves single-space whitespace between sibling tokens (e.g. `const foo`)', () => {
    const input = '<code data-minify-inline>§MZLT§span§MZGT§const§MZLT§/span§MZGT§ §MZLT§span§MZGT§foo§MZLT§/span§MZGT§</code>'
    expect(minifyCodeInline(input)).toBe('<code><span>const</span> <span>foo</span></code>')
  })

  it('is tag-agnostic (works on any element)', () => {
    const input = '<span data-minify-inline>§MZLT§i§MZGT§a§MZLT§/i§MZGT§§MZLT§i§MZGT§b§MZLT§/i§MZGT§</span>'
    expect(minifyCodeInline(input)).toBe('<span><i>a</i><i>b</i></span>')
  })

  it('handles multiple marked elements independently', () => {
    const input = '<code data-minify-inline>§MZLT§span§MZGT§a§MZLT§/span§MZGT§</code> middle <code data-minify-inline>§MZLT§span§MZGT§b§MZLT§/span§MZGT§</code>'
    expect(minifyCodeInline(input)).toBe('<code><span>a</span></code> middle <code><span>b</span></code>')
  })

  it('honors the marker syntax with empty value (data-minify-inline="")', () => {
    const input = '<code data-minify-inline="">§MZLT§span§MZGT§x§MZLT§/span§MZGT§</code>'
    expect(minifyCodeInline(input)).toBe('<code><span>x</span></code>')
  })

  it('is a no-op when no marker is present', () => {
    const input = '<code>§MZLT§span§MZGT§x§MZLT§/span§MZGT§</code>'
    expect(minifyCodeInline(input)).toBe(input)
  })

  it('returns the input unchanged when no marker substring exists (fast path)', () => {
    const input = '<div>hello <span>world</span></div>'
    expect(minifyCodeInline(input)).toBe(input)
  })
})

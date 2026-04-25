import { describe, it, expect } from 'vitest'
import { parse, serialize } from '../../utils/ast/index.ts'
import { msoWidthFromClass } from '../../transformers/msoWidthFromClass.ts'

function run(html: string): string {
  return serialize(msoWidthFromClass(parse(html)))
}

describe('msoWidthFromClass', () => {
  it('replaces placeholder with px-rounded value from max-width in rem', () => {
    const html = `<!--[if mso]><table style="width: __MAIZZLE_MSOW_c1__"><tr><td><![endif]-->`
      + `<div style="max-width: 36rem; margin: 0 auto;" data-maizzle-msow-id="c1">x</div>`
      + `<!--[if mso]></td></tr></table><![endif]-->`
    const out = run(html)
    expect(out).toContain('width: 576px')
    expect(out).not.toContain('__MAIZZLE_MSOW_')
    expect(out).not.toContain('data-maizzle-msow-id')
  })

  it('reads max-width in px directly', () => {
    const html = `<!--[if mso]><table style="width: __MAIZZLE_MSOW_a__"><![endif]-->`
      + `<div style="max-width: 720px;" data-maizzle-msow-id="a"></div>`
      + `<!--[if mso]></table><![endif]-->`
    expect(run(html)).toContain('width: 720px')
  })

  it('falls back to width when max-width is absent', () => {
    const html = `<!--[if mso]><table style="width: __MAIZZLE_MSOW_b__"><![endif]-->`
      + `<div style="width: 480px;" data-maizzle-msow-id="b"></div>`
      + `<!--[if mso]><![endif]-->`
    expect(run(html)).toContain('width: 480px')
  })

  it('passes percentage values through', () => {
    const html = `<!--[if mso]><table style="width: __MAIZZLE_MSOW_p__"><![endif]-->`
      + `<div style="max-width: 50%;" data-maizzle-msow-id="p"></div>`
      + `<!--[if mso]><![endif]-->`
    expect(run(html)).toContain('width: 50%')
  })

  it('falls back to 600px when no style on element', () => {
    const html = `<!--[if mso]><table style="width: __MAIZZLE_MSOW_q__"><![endif]-->`
      + `<div data-maizzle-msow-id="q"></div>`
      + `<!--[if mso]><![endif]-->`
    expect(run(html)).toContain('width: 600px')
  })

  it('uses data-maizzle-msow-fallback when value is unresolvable', () => {
    const html = `<!--[if mso]><table style="width: __MAIZZLE_MSOW_f__"><![endif]-->`
      + `<div data-maizzle-msow-id="f" data-maizzle-msow-fallback="100%"></div>`
      + `<!--[if mso]><![endif]-->`
    const out = run(html)
    expect(out).toContain('width: 100%')
    expect(out).not.toContain('data-maizzle-msow-fallback')
  })

  it('handles multiple containers independently', () => {
    const html = `<!--[if mso]>__MAIZZLE_MSOW_x__|__MAIZZLE_MSOW_y__<![endif]-->`
      + `<div style="max-width: 36rem" data-maizzle-msow-id="x"></div>`
      + `<div style="max-width: 28rem" data-maizzle-msow-id="y"></div>`
    const out = run(html)
    expect(out).toContain('576px|448px')
  })

  it('is a no-op when no markers are present', () => {
    const html = '<div>plain</div>'
    expect(run(html)).toBe(html)
  })

  it('strips marker attribute even when no MSO comment exists', () => {
    const html = `<div style="max-width: 36rem" data-maizzle-msow-id="lonely"></div>`
    const out = run(html)
    expect(out).not.toContain('data-maizzle-msow-id')
  })
})

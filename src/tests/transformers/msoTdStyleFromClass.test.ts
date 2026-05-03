import { describe, it, expect } from 'vitest'
import { parse, serialize } from '../../utils/ast/index.ts'
import { msoTdStyleFromClass } from '../../transformers/msoTdStyleFromClass.ts'

function run(html: string): string {
  return serialize(msoTdStyleFromClass(parse(html)))
}

describe('msoTdStyleFromClass', () => {
  it('mirrors padding shorthand from div style onto the MSO td', () => {
    const html
      = `<!--[if mso]><table><tr><td__MAIZZLE_MSOTDSTYLE_ct1__><![endif]-->`
      + `<div style="max-width: 600px; padding: 24px" data-maizzle-mso-td-id="ct1">x</div>`
      + `<!--[if mso]></td></tr></table><![endif]-->`
    const out = run(html)
    expect(out).toContain('<td style="padding: 24px">')
    expect(out).not.toContain('__MAIZZLE_MSOTDSTYLE_')
    expect(out).not.toContain('data-maizzle-mso-td-id')
  })

  it('mirrors per-side padding longhands', () => {
    const html
      = `<!--[if mso]><table><tr><td__MAIZZLE_MSOTDSTYLE_a__><![endif]-->`
      + `<div style="padding-left: 12px; padding-right: 12px" data-maizzle-mso-td-id="a"></div>`
      + `<!--[if mso]><![endif]-->`
    const out = run(html)
    expect(out).toContain('<td style="padding-left: 12px; padding-right: 12px">')
  })

  it('preserves source order so longhand can override shorthand', () => {
    const html
      = `<!--[if mso]><table><tr><td__MAIZZLE_MSOTDSTYLE_b__><![endif]-->`
      + `<div style="padding: 10px; padding-left: 0" data-maizzle-mso-td-id="b"></div>`
      + `<!--[if mso]><![endif]-->`
    const out = run(html)
    expect(out).toContain('<td style="padding: 10px; padding-left: 0">')
  })

  it('appends msoStyle after padding so it wins on duplicates', () => {
    const html
      = `<!--[if mso]><table><tr><td__MAIZZLE_MSOTDSTYLE_c__><![endif]-->`
      + `<div style="padding: 10px" data-maizzle-mso-td-id="c" data-maizzle-mso-style="padding: 20px"></div>`
      + `<!--[if mso]><![endif]-->`
    const out = run(html)
    expect(out).toContain('<td style="padding: 10px; padding: 20px">')
    expect(out).not.toContain('data-maizzle-mso-style')
  })

  it('emits msoStyle alone when no padding on div', () => {
    const html
      = `<!--[if mso]><table><tr><td__MAIZZLE_MSOTDSTYLE_d__><![endif]-->`
      + `<div data-maizzle-mso-td-id="d" data-maizzle-mso-style="background-color: red"></div>`
      + `<!--[if mso]><![endif]-->`
    expect(run(html)).toContain('<td style="background-color: red">')
  })

  it('emits no style attribute when neither padding nor msoStyle is present', () => {
    const html
      = `<!--[if mso]><table><tr><td__MAIZZLE_MSOTDSTYLE_e__><![endif]-->`
      + `<div style="max-width: 600px" data-maizzle-mso-td-id="e"></div>`
      + `<!--[if mso]><![endif]-->`
    const out = run(html)
    expect(out).toContain('<td>')
    expect(out).not.toContain('__MAIZZLE_MSOTDSTYLE_')
  })

  it('ignores non-padding declarations on the div', () => {
    const html
      = `<!--[if mso]><table><tr><td__MAIZZLE_MSOTDSTYLE_f__><![endif]-->`
      + `<div style="max-width: 600px; padding: 8px; color: red; margin: 4px" data-maizzle-mso-td-id="f"></div>`
      + `<!--[if mso]><![endif]-->`
    const out = run(html)
    expect(out).toContain('<td style="padding: 8px">')
  })

  it('handles multiple containers independently', () => {
    const html
      = `<!--[if mso]><table><tr><td__MAIZZLE_MSOTDSTYLE_x__><![endif]-->`
      + `<div style="padding: 10px" data-maizzle-mso-td-id="x"></div>`
      + `<!--[if mso]></td></tr></table><![endif]-->`
      + `<!--[if mso]><table><tr><td__MAIZZLE_MSOTDSTYLE_y__><![endif]-->`
      + `<div style="padding: 20px" data-maizzle-mso-td-id="y"></div>`
      + `<!--[if mso]></td></tr></table><![endif]-->`
    const out = run(html)
    expect(out).toContain('<td style="padding: 10px">')
    expect(out).toContain('<td style="padding: 20px">')
  })

  it('strips marker attributes even when no MSO comment exists', () => {
    const html = `<div style="padding: 10px" data-maizzle-mso-td-id="lonely" data-maizzle-mso-style="background: red"></div>`
    const out = run(html)
    expect(out).not.toContain('data-maizzle-mso-td-id')
    expect(out).not.toContain('data-maizzle-mso-style')
  })

  it('is a no-op when no markers are present', () => {
    const html = '<div style="padding: 8px">plain</div>'
    expect(run(html)).toBe(html)
  })

  it('preserves !important on padding declarations', () => {
    const html
      = `<!--[if mso]><table><tr><td__MAIZZLE_MSOTDSTYLE_imp__><![endif]-->`
      + `<div style="padding: 12px !important" data-maizzle-mso-td-id="imp"></div>`
      + `<!--[if mso]><![endif]-->`
    expect(run(html)).toContain('<td style="padding: 12px !important">')
  })
})

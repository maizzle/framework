import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { parse, serialize } from '../../utils/ast/index.ts'
import { msoPlaceholders } from '../../transformers/msoPlaceholders.ts'
import Container from '../../components/Container.vue'

function run(html: string): string {
  return serialize(msoPlaceholders(parse(html)))
}

describe('msoPlaceholders — MSOW (table width)', () => {
  it('replaces placeholder with px-rounded value from max-width in rem', () => {
    const html = `<!--[if mso]><table style="width: __MAIZZLE_MSOW_c1__"><tr><td><![endif]-->`
      + `<div style="max-width: 36rem; margin: 0 auto;" data-maizzle-msow-id="c1">x</div>`
      + `<!--[if mso]></td></tr></table><![endif]-->`
    const out = run(html)
    expect(out).toContain('width: 576px')
    expect(out).not.toContain('__MAIZZLE_MSOW_')
    expect(out).not.toContain('data-maizzle-msow-id')
  })

  it('replaces placeholder with px-rounded value from max-width in pt', () => {
    const html = `<!--[if mso]><table style="width: __MAIZZLE_MSOW_pt__"><![endif]-->`
      + `<div style="max-width: 75pt;" data-maizzle-msow-id="pt"></div>`
      + `<!--[if mso]></table><![endif]-->`
    // 75 * 1.333 = 99.975 -> 100
    expect(run(html)).toContain('width: 100px')
  })

  it('treats a unitless width as px', () => {
    const html = `<!--[if mso]><table style="width: __MAIZZLE_MSOW_u__"><![endif]-->`
      + `<div style="max-width: 480;" data-maizzle-msow-id="u"></div>`
      + `<!--[if mso]></table><![endif]-->`
    expect(run(html)).toContain('width: 480px')
  })

  it('uses the fallback when the width value is non-numeric', () => {
    const html = `<!--[if mso]><table style="width: __MAIZZLE_MSOW_n__"><![endif]-->`
      + `<div style="max-width: auto;" data-maizzle-msow-id="n"></div>`
      + `<!--[if mso]></table><![endif]-->`
    expect(run(html)).toContain('width: 600px')
  })

  it('skips empty comment nodes while resolving', () => {
    const html = `<!---->`
      + `<!--[if mso]><table style="width: __MAIZZLE_MSOW_e__"><![endif]-->`
      + `<div style="max-width: 300px;" data-maizzle-msow-id="e"></div>`
      + `<!--[if mso]></table><![endif]-->`
    expect(run(html)).toContain('width: 300px')
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

  it('strips marker attribute even when no MSO comment exists', () => {
    const html = `<div style="max-width: 36rem" data-maizzle-msow-id="lonely"></div>`
    const out = run(html)
    expect(out).not.toContain('data-maizzle-msow-id')
  })
})

describe('msoPlaceholders — MSOTDSTYLE (Container td)', () => {
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

  it('preserves !important on padding declarations', () => {
    const html
      = `<!--[if mso]><table><tr><td__MAIZZLE_MSOTDSTYLE_imp__><![endif]-->`
      + `<div style="padding: 12px !important" data-maizzle-mso-td-id="imp"></div>`
      + `<!--[if mso]><![endif]-->`
    expect(run(html)).toContain('<td style="padding: 12px !important">')
  })

  it('mirrors background-color to the MSO td (always, when present)', () => {
    const html
      = `<!--[if mso]><table><tr><td__MAIZZLE_MSOTDSTYLE_bg1__><![endif]-->`
      + `<div style="background-color: #abc; padding: 8px" data-maizzle-mso-td-id="bg1"></div>`
      + `<!--[if mso]></td></tr></table><![endif]-->`
    expect(run(html)).toContain('<td style="background-color: #abc; padding: 8px">')
  })

  it('mirrors background-color even when the div has no padding', () => {
    const html
      = `<!--[if mso]><table><tr><td__MAIZZLE_MSOTDSTYLE_bg2__><![endif]-->`
      + `<div style="background-color: white" data-maizzle-mso-td-id="bg2"></div>`
      + `<!--[if mso]></td></tr></table><![endif]-->`
    expect(run(html)).toContain('<td style="background-color: white">')
  })

  it('skips padding hoist when a horizontal border is present (border stabilizes div padding in Word)', () => {
    const html
      = `<!--[if mso]><table><tr><td__MAIZZLE_MSOTDSTYLE_brd__><![endif]-->`
      + `<div style="background-color: #f00; padding: 8px; border-width: 1px; border-style: solid" data-maizzle-mso-td-id="brd"></div>`
      + `<!--[if mso]></td></tr></table><![endif]-->`
    const out = run(html)
    // bg-color still mirrors; padding stays on the div only
    expect(out).toContain('<td style="background-color: #f00">')
    expect(out).not.toMatch(/<td[^>]+padding/)
  })

  it('honors border-style: none as no border (still hoists padding)', () => {
    const html
      = `<!--[if mso]><table><tr><td__MAIZZLE_MSOTDSTYLE_none__><![endif]-->`
      + `<div style="padding: 8px; border-width: 1px; border-style: none" data-maizzle-mso-td-id="none"></div>`
      + `<!--[if mso]></td></tr></table><![endif]-->`
    expect(run(html)).toContain('<td style="padding: 8px">')
  })

  it('preserves !important on background-color', () => {
    const html
      = `<!--[if mso]><table><tr><td__MAIZZLE_MSOTDSTYLE_bgimp__><![endif]-->`
      + `<div style="background-color: red !important" data-maizzle-mso-td-id="bgimp"></div>`
      + `<!--[if mso]></td></tr></table><![endif]-->`
    expect(run(html)).toContain('<td style="background-color: red !important">')
  })

  describe('Container integration (component → transformer)', () => {
    /**
     * Walk the rendered Container HTML through the transformer with a
     * synthetic inlined style on the div, mimicking what juice produces
     * after Tailwind compiles `bg-*`, `p-*`, `border` class output.
     */
    const renderContainer = (props: Record<string, unknown>, inlinedStyle: string): string => {
      const rendered = mount(Container, { props }).html()
      const withStyle = rendered.replace(
        /<div([^>]*)data-maizzle-mso-td-id="(ct\d+)"/,
        (_m, before, id) => `<div${before}data-maizzle-mso-td-id="${id}" style="${inlinedStyle}"`
      )
      return run(withStyle)
    }

    it('mirrors background-color from a class-derived inline style onto the MSO td', () => {
      const out = renderContainer({}, 'max-width: 600px; background-color: rgb(255, 255, 255)')
      expect(out).toContain('<td style="background-color: rgb(255, 255, 255)">')
    })

    it('hoists padding when Container has no border', () => {
      const out = renderContainer({}, 'max-width: 600px; padding: 24px; background-color: #fff')
      expect(out).toContain('<td style="background-color: #fff; padding: 24px">')
    })

    it('skips padding hoist when Container has a horizontal border (avoids double-pad in Word)', () => {
      const out = renderContainer(
        {},
        'max-width: 600px; padding: 24px; border-width: 1px; border-style: solid; background-color: #fff'
      )
      expect(out).toContain('<td style="background-color: #fff">')
      expect(out).not.toMatch(/<td[^>]+padding/)
    })

    it('mso-style still wins over the hoisted bg + padding (CSS last-wins)', () => {
      const out = renderContainer(
        { msoStyle: 'padding: 8px; background-color: #000' },
        'max-width: 600px; padding: 24px; background-color: #fff'
      )
      expect(out).toContain('<td style="background-color: #fff; padding: 24px; padding: 8px; background-color: #000">')
    })
  })
})

describe('msoPlaceholders — combined', () => {
  it('resolves both placeholder kinds from the same Container div in one pass', () => {
    const html
      = `<!--[if mso]><table style="width: __MAIZZLE_MSOW_c1__"><tr><td__MAIZZLE_MSOTDSTYLE_ct1__><![endif]-->`
      + `<div style="max-width: 36rem; padding: 24px" data-maizzle-msow-id="c1" data-maizzle-mso-td-id="ct1">x</div>`
      + `<!--[if mso]></td></tr></table><![endif]-->`
    const out = run(html)
    expect(out).toContain('width: 576px')
    expect(out).toContain('<td style="padding: 24px">')
    expect(out).not.toContain('__MAIZZLE_MSOW_')
    expect(out).not.toContain('__MAIZZLE_MSOTDSTYLE_')
    expect(out).not.toContain('data-maizzle-msow-id')
    expect(out).not.toContain('data-maizzle-mso-td-id')
  })

  it('is a no-op when no markers are present', () => {
    const html = '<div style="padding: 8px">plain</div>'
    expect(run(html)).toBe(html)
  })
})

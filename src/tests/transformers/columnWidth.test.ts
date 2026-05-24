import { describe, it, expect } from 'vitest'
import { parse, serialize } from '../../utils/ast/index.ts'
import { columnWidth } from '../../transformers/columnWidth.ts'

function run(html: string): string {
  return serialize(columnWidth(parse(html)))
}

const col = (id: string, count: number, extra = '') =>
  `<div style="display: inline-block; min-width: __MAIZZLE_COLW_${id}__; font-size: 16px;" data-maizzle-cw-id="${id}" data-maizzle-cw-count="${count}"${extra}></div>`

describe('columnWidth', () => {
  it('resolves min-width from an explicit data-maizzle-cw value on the parent', () => {
    const html = `<div data-maizzle-cw="600px">${col('c1', 2)}${col('c2', 2)}</div>`
    const out = run(html)
    expect(out).toContain('width: 300px')
    expect(out).not.toContain('__MAIZZLE_COLW_')
    expect(out).not.toContain('data-maizzle-cw')
  })

  it('reads max-width from the parent style when data-maizzle-cw is empty', () => {
    const html = `<div data-maizzle-cw="" style="max-width: 576px">${col('c1', 2)}${col('c2', 2)}</div>`
    expect(run(html)).toContain('width: 288px')
  })

  it('reads width from the parent style when max-width is absent', () => {
    const html = `<div data-maizzle-cw="" style="width: 480px">${col('c1', 3)}</div>`
    expect(run(html)).toContain('width: 160px')
  })

  it('walks up past intermediate elements without data-maizzle-cw', () => {
    const html =
      `<div data-maizzle-cw="600px"><div><div>${col('c1', 2)}</div></div></div>`
    expect(run(html)).toContain('width: 300px')
  })

  it('uses the nearest sized ancestor (Section over Container)', () => {
    const html =
      `<div data-maizzle-cw="600px">`
      + `<div data-maizzle-cw="400px">${col('c1', 2)}</div>`
      + `</div>`
    expect(run(html)).toContain('width: 200px')
  })

  describe('padding-aware width subtraction', () => {
    it('subtracts intermediate ancestor horizontal padding from the source width', () => {
      // <Container max-w-xl><Section style="padding: 0 36px"><Row>...
      const html =
        `<div data-maizzle-cw="" style="max-width: 576px">`
        + `<div style="padding: 0 36px">`
        + `<div data-maizzle-cw="" style="font-size: 0;">${col('c1', 2)}${col('c2', 2)}</div>`
        + `</div>`
        + `</div>`
      const out = run(html)
      // (576 − 72) / 2 = 252
      expect(out.match(/width: 252px/g)?.length).toBe(2)
    })

    it('reads padding from utility-class compiled output (px-9 → 36px each side)', () => {
      const html =
        `<div data-maizzle-cw="" style="max-width: 576px">`
        + `<div style="padding-left: 36px; padding-right: 36px">`
        + `<div data-maizzle-cw="" style="font-size: 0;">${col('c1', 2)}${col('c2', 2)}</div>`
        + `</div>`
        + `</div>`
      expect(run(html)).toContain('width: 252px')
    })

    it('subtracts the source\'s own horizontal padding too', () => {
      const html =
        `<div data-maizzle-cw="" style="max-width: 600px; padding: 0 36px">`
        + `${col('c1', 2)}${col('c2', 2)}`
        + `</div>`
      // (600 − 72) / 2 = 264
      expect(run(html)).toContain('width: 264px')
    })

    it('handles padding shorthand with all four values', () => {
      // padding: T R B L → uses R + L
      const html =
        `<div data-maizzle-cw="" style="max-width: 600px">`
        + `<div style="padding: 10px 20px 10px 30px">`
        + `<div data-maizzle-cw="" style="font-size: 0;">${col('c1', 2)}</div>`
        + `</div>`
        + `</div>`
      // 600 − (20 + 30) = 550 / 2 = 275
      expect(run(html)).toContain('width: 275px')
    })

    it('longhand padding-left/right overrides shorthand when both present', () => {
      const html =
        `<div data-maizzle-cw="" style="max-width: 600px">`
        + `<div style="padding: 0 20px; padding-left: 50px">`
        + `<div data-maizzle-cw="" style="font-size: 0;">${col('c1', 2)}</div>`
        + `</div>`
        + `</div>`
      // 600 − (20 + 50) = 530 / 2 = 265
      expect(run(html)).toContain('width: 265px')
    })

    it('skips percentage padding (cannot resolve against unknown container)', () => {
      const html =
        `<div data-maizzle-cw="" style="max-width: 600px">`
        + `<div style="padding: 0 5%">`
        + `<div data-maizzle-cw="" style="font-size: 0;">${col('c1', 2)}</div>`
        + `</div>`
        + `</div>`
      // % padding ignored → 600 / 2 = 300
      expect(run(html)).toContain('width: 300px')
    })

    it('skips padding subtraction when the source width is a percentage', () => {
      const html =
        `<div data-maizzle-cw="100%">`
        + `<div style="padding: 0 36px">`
        + `<div data-maizzle-cw="" style="font-size: 0;">${col('c1', 2)}</div>`
        + `</div>`
        + `</div>`
      // 100% / 2 = 50% (px padding can't be subtracted from %)
      expect(run(html)).toContain('width: 50%')
    })

    it('subtracts horizontal borders from the source width', () => {
      const html =
        `<div data-maizzle-cw="" style="max-width: 600px">`
        + `<div style="border: 4px solid red">`
        + `<div data-maizzle-cw="" style="font-size: 0;">${col('c1', 2)}${col('c2', 2)}</div>`
        + `</div>`
        + `</div>`
      // 600 − (4 + 4) = 592 / 2 = 296
      expect(run(html)).toContain('width: 296px')
    })

    it('combines padding and borders along the walk', () => {
      const html =
        `<div data-maizzle-cw="" style="max-width: 600px; border: 2px solid red; padding: 0 10px">`
        + `<div style="padding: 0 36px; border-left: 4px solid; border-right: 6px solid">`
        + `<div data-maizzle-cw="" style="font-size: 0;">${col('c1', 2)}</div>`
        + `</div>`
        + `</div>`
      // 600 − (2+2 + 10+10 + 36+36 + 4+6) = 600 − 106 = 494 / 2 = 247
      expect(run(html)).toContain('width: 247px')
    })

    it('honors border-style: none / hidden as no-border', () => {
      const html =
        `<div data-maizzle-cw="" style="max-width: 600px">`
        + `<div style="border-width: 4px; border-style: none">`
        + `<div data-maizzle-cw="" style="font-size: 0;">${col('c1', 2)}</div>`
        + `</div>`
        + `</div>`
      // border-style: none zeroes the contribution → 600 / 2 = 300
      expect(run(html)).toContain('width: 300px')
    })

    it('reads border-left-width / border-right-width longhands', () => {
      const html =
        `<div data-maizzle-cw="" style="max-width: 600px">`
        + `<div style="border-left-width: 8px; border-right-width: 12px; border-style: solid">`
        + `<div data-maizzle-cw="" style="font-size: 0;">${col('c1', 2)}</div>`
        + `</div>`
        + `</div>`
      // 600 − (8 + 12) = 580 / 2 = 290
      expect(run(html)).toContain('width: 290px')
    })

    it('treats `border: solid red` (no width) as medium = 3px', () => {
      const html =
        `<div data-maizzle-cw="" style="max-width: 600px">`
        + `<div style="border: solid red">`
        + `<div data-maizzle-cw="" style="font-size: 0;">${col('c1', 2)}</div>`
        + `</div>`
        + `</div>`
      // 600 − (3 + 3) = 594 / 2 = 297
      expect(run(html)).toContain('width: 297px')
    })

    it('subtracts the column\'s own horizontal border from the emitted min-width', () => {
      const borderedCol = (id: string, count: number) =>
        `<div style="display: inline-block; min-width: __MAIZZLE_COLW_${id}__; border-width: 1px; border-style: solid;" data-maizzle-cw-id="${id}" data-maizzle-cw-count="${count}"></div>`
      const html =
        `<div data-maizzle-cw="" style="max-width: 576px">`
        + `<div data-maizzle-cw="" style="font-size: 0;">${borderedCol('c1', 2)}${borderedCol('c2', 2)}</div>`
        + `</div>`
      const out = run(html)
      // 576 / 2 = 288 outer slice; col own border = 2px → content min = 286
      expect(out.match(/width: 286px/g)?.length).toBe(2)
      expect(out).not.toContain('width: 288px')
    })

    it('subtracts the column\'s own horizontal padding from the emitted min-width', () => {
      const paddedCol = (id: string, count: number) =>
        `<div style="display: inline-block; min-width: __MAIZZLE_COLW_${id}__; padding: 0 8px;" data-maizzle-cw-id="${id}" data-maizzle-cw-count="${count}"></div>`
      const html =
        `<div data-maizzle-cw="" style="max-width: 600px">`
        + `<div data-maizzle-cw="" style="font-size: 0;">${paddedCol('c1', 2)}${paddedCol('c2', 2)}</div>`
        + `</div>`
      const out = run(html)
      // 600 / 2 = 300 outer; col padding 8+8 = 16 → content = 284
      expect(out.match(/width: 284px/g)?.length).toBe(2)
    })

    it('keeps data-maizzle-cw at the outer slice so nested rows account for the column\'s border', () => {
      /**
       * Outer Container 600 → 2 outer cols with 1px border each (outer = 300,
       * content = 298). Inner Row in col 1 has 2 nested cols → source = 298,
       * so each nested column resolves to 149 outer width.
       */
      const borderedOuter = (id: string, count: number, inner: string) =>
        `<div style="display: inline-block; min-width: __MAIZZLE_COLW_${id}__; border-width: 1px; border-style: solid;" data-maizzle-cw-id="${id}" data-maizzle-cw-count="${count}">${inner}</div>`
      const inner =
        `<div>`
        + `<div style="display: inline-block; min-width: __MAIZZLE_COLW_n1__;" data-maizzle-cw-id="n1" data-maizzle-cw-count="2"></div>`
        + `<div style="display: inline-block; min-width: __MAIZZLE_COLW_n2__;" data-maizzle-cw-id="n2" data-maizzle-cw-count="2"></div>`
        + `</div>`
      const html =
        `<div data-maizzle-cw="600px">`
        + `<div data-maizzle-cw="" style="font-size: 0;">${borderedOuter('o1', 2, inner)}</div>`
        + `</div>`
      const out = run(html)
      // Outer col emitted width: 298 (300 outer - 2 border).
      expect(out).toContain('width: 298px')
      // Nested cols see outer col's data-maizzle-cw=300, walk up & subtract its 2px border → 298/2 = 149.
      expect(out.match(/width: 149px/g)?.length).toBe(2)
    })

    it('propagates the column-own-border adjustment to MSO td as the outer slice (not the content)', () => {
      const borderedColMso = (id: string, count: number) =>
        `<!--[if mso]><td style="width: __MAIZZLE_COLW_${id}__"><![endif]-->`
        + `<div style="display: inline-block; min-width: __MAIZZLE_COLW_${id}__; border-width: 1px; border-style: solid;" data-maizzle-cw-id="${id}" data-maizzle-cw-count="${count}"></div>`
        + `<!--[if mso]></td><![endif]-->`
      const html =
        `<div data-maizzle-cw="" style="max-width: 576px">`
        + `<div data-maizzle-cw="" style="font-size: 0;">${borderedColMso('c1', 2)}${borderedColMso('c2', 2)}</div>`
        + `</div>`
      const out = run(html)
      // MSO td keeps the outer slice (288). Div content shrinks to 286.
      expect(out).toContain('<td style="width: 288px">')
      expect(out.match(/width: 286px/g)?.length).toBe(2)
    })

    it('treats `border: 0` as zero contribution', () => {
      const html =
        `<div data-maizzle-cw="" style="max-width: 600px">`
        + `<div style="border: 0">`
        + `<div data-maizzle-cw="" style="font-size: 0;">${col('c1', 2)}</div>`
        + `</div>`
        + `</div>`
      expect(run(html)).toContain('width: 300px')
    })

    describe('mso-td padding hoist (Word lacks div padding without border)', () => {
      const colWithMsoTdx = (id: string, count: number, divStyle: string) =>
        `<!--[if mso]><td style="width: __MAIZZLE_COLW_${id}__; vertical-align: top; __MAIZZLE_COLTDX_${id}__"><![endif]-->`
        + `<div style="display: inline-block; min-width: __MAIZZLE_COLW_${id}__; ${divStyle}" data-maizzle-cw-id="${id}" data-maizzle-cw-count="${count}"></div>`
        + `<!--[if mso]></td><![endif]-->`

      it('case A: no padding, no border — td width = slot, no hoist', () => {
        const html =
          `<div data-maizzle-cw="" style="max-width: 576px">`
          + `<div data-maizzle-cw="" style="font-size: 0;">${colWithMsoTdx('c1', 2, '')}${colWithMsoTdx('c2', 2, '')}</div>`
          + `</div>`
        const out = run(html)
        expect(out.match(/<td style="width: 288px; vertical-align: top">/g)?.length).toBe(2)
        expect(out).not.toContain('padding')
      })

      it('case B: border only — td width = slot, no hoist', () => {
        const html =
          `<div data-maizzle-cw="" style="max-width: 576px">`
          + `<div data-maizzle-cw="" style="font-size: 0;">`
          + colWithMsoTdx('c1', 2, 'border-width: 1px; border-style: solid;')
          + colWithMsoTdx('c2', 2, 'border-width: 1px; border-style: solid;')
          + `</div></div>`
        const out = run(html)
        // td stays at outer slot 288; padding not hoisted.
        expect(out.match(/<td style="width: 288px; vertical-align: top">/g)?.length).toBe(2)
        expect(out).not.toMatch(/<td[^>]+padding/)
        // div content = 288 − 2 = 286
        expect(out.match(/width: 286px/g)?.length).toBe(2)
      })

      it('case C: padding only — td width = slot − 2*pad, padding hoisted', () => {
        const html =
          `<div data-maizzle-cw="" style="max-width: 576px">`
          + `<div data-maizzle-cw="" style="font-size: 0;">`
          + colWithMsoTdx('c1', 2, 'padding: 8px;')
          + colWithMsoTdx('c2', 2, 'padding: 8px;')
          + `</div></div>`
        const out = run(html)
        // 288 − 16 = 272 on the MSO td, plus the hoisted padding decl.
        expect(out.match(/<td style="width: 272px; vertical-align: top; padding: 8px">/g)?.length).toBe(2)
        // div content also at 272 (slot − own inset).
        expect(out.match(/width: 272px/g)?.length).toBeGreaterThanOrEqual(4)
      })

      it('case D: border + padding — td width = slot, no hoist (div carries padding)', () => {
        const html =
          `<div data-maizzle-cw="" style="max-width: 576px">`
          + `<div data-maizzle-cw="" style="font-size: 0;">`
          + colWithMsoTdx('c1', 2, 'border-width: 1px; border-style: solid; padding: 8px;')
          + colWithMsoTdx('c2', 2, 'border-width: 1px; border-style: solid; padding: 8px;')
          + `</div></div>`
        const out = run(html)
        // td at outer slot, no padding hoisted.
        expect(out.match(/<td style="width: 288px; vertical-align: top">/g)?.length).toBe(2)
        expect(out).not.toMatch(/<td[^>]+padding/)
        // div content = 288 − 18 = 270
        expect(out.match(/width: 270px/g)?.length).toBe(2)
      })

      it('hoists asymmetric padding (pl-4 pr-2) and adjusts td width by left+right total', () => {
        const html =
          `<div data-maizzle-cw="" style="max-width: 600px">`
          + `<div data-maizzle-cw="" style="font-size: 0;">`
          + colWithMsoTdx('c1', 2, 'padding-left: 16px; padding-right: 8px;')
          + colWithMsoTdx('c2', 2, 'padding-left: 16px; padding-right: 8px;')
          + `</div></div>`
        const out = run(html)
        // 300 − 24 = 276; both pl/pr decls preserved on td
        expect(out.match(/<td style="width: 276px; vertical-align: top; padding-left: 16px; padding-right: 8px">/g)?.length).toBe(2)
      })

      it('skips hoist when the slot is a percentage', () => {
        const html =
          `<div data-maizzle-cw="100%">`
          + `<div data-maizzle-cw="" style="font-size: 0;">`
          + colWithMsoTdx('c1', 2, 'padding: 8px;')
          + `</div></div>`
        const out = run(html)
        // % slot → no hoist, td renders at 50% (fallback / count-based %)
        expect(out).toContain('<td style="width: 50%; vertical-align: top">')
        expect(out).not.toMatch(/<td[^>]+padding/)
      })

      it('mirrors background-color to the MSO td (regardless of border / padding state)', () => {
        const html =
          `<div data-maizzle-cw="" style="max-width: 576px">`
          + `<div data-maizzle-cw="" style="font-size: 0;">`
          + colWithMsoTdx('c1', 2, 'background-color: rgb(229, 231, 235);')
          + colWithMsoTdx('c2', 2, 'background-color: rgb(156, 163, 175); border-width: 1px; border-style: solid;')
          + `</div></div>`
        const out = run(html)
        // Plain bg col: td at slot, bg mirrored.
        expect(out).toContain('<td style="width: 288px; vertical-align: top; background-color: rgb(229, 231, 235)">')
        // Bg + border col: td at slot, bg mirrored, no padding hoist.
        expect(out).toContain('<td style="width: 288px; vertical-align: top; background-color: rgb(156, 163, 175)">')
      })

      it('mirrors background-color AND hoists padding when no border', () => {
        const html =
          `<div data-maizzle-cw="" style="max-width: 576px">`
          + `<div data-maizzle-cw="" style="font-size: 0;">`
          + colWithMsoTdx('c1', 2, 'background-color: #abc; padding: 8px;')
          + `</div></div>`
        const out = run(html)
        // Both bg and padding land on td; td width compensates for padding.
        expect(out).toContain('<td style="width: 272px; vertical-align: top; background-color: #abc; padding: 8px">')
      })

      it('removes the COLTDX placeholder when no column matches (defensive cleanup)', () => {
        const html =
          `<!--[if mso]><td style="width: __MAIZZLE_COLW_orphan__; vertical-align: top; __MAIZZLE_COLTDX_orphan__"><![endif]-->`
        const out = run(html)
        expect(out).not.toContain('__MAIZZLE_COLTDX_')
        expect(out).toContain('<td style="width: 100%; vertical-align: top">')
      })
    })

    it('propagates the padding-adjusted width to the MSO td placeholder', () => {
      const colWithMso = (id: string, count: number) =>
        `<!--[if mso]><td style="width: __MAIZZLE_COLW_${id}__"><![endif]-->`
        + col(id, count)
        + `<!--[if mso]></td><![endif]-->`
      const html =
        `<div data-maizzle-cw="" style="max-width: 576px">`
        + `<div style="padding: 0 36px">`
        + `<div data-maizzle-cw="" style="font-size: 0;">${colWithMso('c1', 2)}${colWithMso('c2', 2)}</div>`
        + `</div>`
        + `</div>`
      const out = run(html)
      // MSO td width and visible div min-width should both reflect 252px
      expect(out.match(/252px/g)?.length).toBeGreaterThanOrEqual(4)
    })
  })

  describe('user-set width / max-width on Column', () => {
    const userCol = (id: string, count: number, userStyle: string) =>
      `<div style="display: inline-block; min-width: __MAIZZLE_COLW_${id}__; ${userStyle}" data-maizzle-cw-id="${id}" data-maizzle-cw-count="${count}"></div>`

    it('keeps `width: X%` and drops min-width — opt-out of mobile stacking', () => {
      const html =
        `<div data-maizzle-cw="576px">`
        + userCol('c1', 2, 'width: 33.33%')
        + userCol('c2', 2, 'width: 66.67%')
        + `</div>`
      const out = run(html)
      expect(out).toContain('width: 33.33%')
      expect(out).toContain('width: 66.67%')
      expect(out).not.toContain('min-width')
      expect(out).not.toContain('__MAIZZLE_COLW_')
    })

    it('promotes absolute `width:` to the resolved width + max-width: 100%, stripping the user dup', () => {
      const html =
        `<div data-maizzle-cw="576px">`
        + userCol('c1', 2, 'width: 192px')
        + userCol('c2', 2, 'width: 24rem')
        + `</div>`
      const out = run(html)
      expect(out).toContain('width: 192px; max-width: 100%')
      // 24rem = 384px
      expect(out).toContain('width: 384px; max-width: 100%')
      // Exactly one `width:` per column — the user's duplicate is stripped.
      expect((out.match(/width: 192px/g) || []).length).toBe(1)
      expect((out.match(/width: 384px/g) || []).length).toBe(1)
    })

    it('does not emit `max-width: 100%` when the user already supplied their own max-width', () => {
      const html =
        `<div data-maizzle-cw="576px">`
        + userCol('c1', 2, 'max-width: 384px')
        + `</div>`
      const out = run(html)
      // Style should have a single max-width — the user's — and no `max-width: 100%`.
      expect(out).toContain('max-width: 384px')
      expect(out).not.toContain('max-width: 100%')
    })

    it('caps count-based min-width down to user max-width when min would exceed it', () => {
      const html =
        `<div data-maizzle-cw="576px">`
        + userCol('c1', 2, 'max-width: 192px')
        + userCol('c2', 2, 'max-width: 384px')
        + `</div>`
      const out = run(html)
      // count-based = 288. Col 1: 288 > 192 → cap to 192. Col 2: 288 < 384 → stays 288.
      expect(out).toContain('width: 192px')
      expect(out).toContain('max-width: 192px')
      expect(out).toContain('width: 288px')
      expect(out).toContain('max-width: 384px')
    })

    it('user override propagates to the MSO td placeholder as the same value', () => {
      const colWithMso = (id: string, count: number, userStyle: string) =>
        `<!--[if mso]><td style="width: __MAIZZLE_COLW_${id}__"><![endif]-->`
        + userCol(id, count, userStyle)
        + `<!--[if mso]></td><![endif]-->`
      const html =
        `<div data-maizzle-cw="576px">`
        + colWithMso('c1', 2, 'width: 33.33%')
        + colWithMso('c2', 2, 'width: 192px')
        + `</div>`
      const out = run(html)
      // Percentage column → MSO td uses the same percentage.
      expect(out).toContain('<td style="width: 33.33%">')
      // Absolute column → MSO td uses the px value.
      expect(out).toContain('<td style="width: 192px">')
    })

    it('`width:` takes priority over `max-width:` when both are set', () => {
      const html =
        `<div data-maizzle-cw="576px">`
        + userCol('c1', 2, 'width: 50%; max-width: 200px')
        + `</div>`
      const out = run(html)
      // width:50% → opt-out path. min-width dropped, max-width left alone.
      expect(out).toContain('width: 50%')
      expect(out).toContain('max-width: 200px')
      expect(out).not.toContain('min-width')
    })

    it('falls back to count-based math when neither width nor max-width is set', () => {
      const html =
        `<div data-maizzle-cw="600px">`
        + userCol('c1', 2, 'background: red')
        + `</div>`
      // 600 / 2 = 300
      expect(run(html)).toContain('width: 300px')
    })

    it('uses user `min-width:` (post-juice, second declaration) and strips it', () => {
      /**
       * Mirrors what juice actually produces: our placeholder declaration
       * comes first (from Vue's :style), then the class-derived
       * `min-width: X%` (juice-appended).
       */
      const realJuiceCol = (id: string, count: number, userMin: string) =>
        `<div style="display: inline-block; min-width: __MAIZZLE_COLW_${id}__; font-size: 16px; vertical-align: top; min-width: ${userMin}; background-color: #38bdf8" data-maizzle-cw-id="${id}" data-maizzle-cw-count="${count}"></div>`

      const html =
        `<div data-maizzle-cw="576px">`
        + realJuiceCol('c1', 2, '33.3333%')
        + realJuiceCol('c2', 2, '66.6667%')
        + `</div>`
      const out = run(html)
      // 576 × 33.33% = 192, 576 × 66.67% = 384
      expect(out).toContain('width: 192px; max-width: 100%')
      expect(out).toContain('width: 384px; max-width: 100%')
      // User's percentage min-width is gone — only our resolved px width remains.
      expect(out).not.toContain('33.3333%')
      expect(out).not.toContain('66.6667%')
      expect(out).not.toContain('min-width')
    })

    it('passes through absolute user `min-width:` without conversion', () => {
      const realJuiceCol = (id: string, count: number, userMin: string) =>
        `<div style="display: inline-block; min-width: __MAIZZLE_COLW_${id}__; min-width: ${userMin}" data-maizzle-cw-id="${id}" data-maizzle-cw-count="${count}"></div>`

      const html =
        `<div data-maizzle-cw="576px">`
        + realJuiceCol('c1', 2, '200px')
        + `</div>`
      expect(run(html)).toContain('width: 200px')
    })

    it('skips max-width capping when the source itself is a percentage', () => {
      const html =
        `<div data-maizzle-cw="100%">`
        + userCol('c1', 2, 'max-width: 192px')
        + `</div>`
      const out = run(html)
      /**
       * Source is %, count-based = 50%, cannot meaningfully compare/cap with px
       * → cap to user's max anyway? No, falls through. Actually: countBased is
       * '50%', endsWith('px') is false, branch taken → cappedMin = maxPx = 192px.
       */
      expect(out).toContain('width: 192px')
    })
  })

  describe('sibling-aware width redistribution', () => {
    const explicit = (id: string, count: number, widthCss: string) =>
      `<div style="display: inline-block; min-width: __MAIZZLE_COLW_${id}__; ${widthCss}" data-maizzle-cw-id="${id}" data-maizzle-cw-count="${count}"></div>`

    it('auto cols absorb remainder when one sibling has explicit px width', () => {
      const html =
        `<div data-maizzle-cw="576px">`
        + col('c1', 3)
        + explicit('c2', 3, 'width: 20px')
        + col('c3', 3)
        + `</div>`
      const out = run(html)
      // (576 − 20) / 2 = 278 for the auto cols, 20 for the explicit one.
      expect(out.match(/width: 278px/g)?.length).toBe(2)
      expect(out).toContain('width: 20px')
    })

    it('auto cols absorb remainder when one sibling has explicit % width', () => {
      const html =
        `<div data-maizzle-cw="600px">`
        + col('c1', 3)
        + explicit('c2', 3, 'width: 33.33%')
        + col('c3', 3)
        + `</div>`
      const out = run(html)
      // 33.33% × 600 = 199.98. Remaining = 400.02 / 2 = 200.01 per auto col.
      expect(out.match(/width: 200\.01px/g)?.length).toBe(2)
      expect(out).toContain('width: 33.33%')
    })

    it('mixes explicit-px and explicit-% siblings; auto col takes the rest', () => {
      const html =
        `<div data-maizzle-cw="600px">`
        + explicit('c1', 3, 'width: 50%')
        + explicit('c2', 3, 'width: 100px')
        + col('c3', 3)
        + `</div>`
      const out = run(html)
      // 50% of 600 = 300, plus 100px = 400 taken. Remainder = 200 for the lone auto col.
      expect(out).toContain('width: 200px')
      expect(out).toContain('width: 50%')
      expect(out).toContain('width: 100px')
    })

    it('counts horizontal padding+border of the explicit sibling against the remainder', () => {
      const html =
        `<div data-maizzle-cw="600px">`
        + col('c1', 3)
        + explicit('c2', 3, 'width: 20px; padding-left: 4px; padding-right: 4px; border-width: 1px; border-style: solid')
        + col('c3', 3)
        + `</div>`
      const out = run(html)
      // Explicit outer = 20 + 8 (padding) + 2 (border) = 30. Remaining = 570 / 2 = 285.
      expect(out.match(/width: 285px/g)?.length).toBe(2)
    })

    it('falls back to count-based divide when no explicit siblings exist', () => {
      const html =
        `<div data-maizzle-cw="576px">`
        + col('c1', 3)
        + col('c2', 3)
        + col('c3', 3)
        + `</div>`
      // No explicits → divisor stays at totalCount=3. (576/3 = 192)
      expect(run(html).match(/width: 192px/g)?.length).toBe(3)
    })

    it('keeps redistribution local to each row group (nested rows independent)', () => {
      /**
       * Outer: auto + w-5 + auto in 600px → autos = 290 each.
       * Inner row in c1 (290px source): 2 auto cols → 145 each.
       */
      const html =
        `<div data-maizzle-cw="600px">`
        + `<div style="display: inline-block; min-width: __MAIZZLE_COLW_c1__;" data-maizzle-cw-id="c1" data-maizzle-cw-count="3">`
        + col('n1', 2)
        + col('n2', 2)
        + `</div>`
        + explicit('c2', 3, 'width: 20px')
        + col('c3', 3)
        + `</div>`
      const out = run(html)
      expect(out.match(/width: 290px/g)?.length).toBe(2)
      expect(out.match(/width: 145px/g)?.length).toBe(2)
    })

    it('skips redistribution when the source is a percentage (can\'t subtract px sibling)', () => {
      const html =
        `<div data-maizzle-cw="100%">`
        + col('c1', 3)
        + explicit('c2', 3, 'width: 20px')
        + col('c3', 3)
        + `</div>`
      const out = run(html)
      // Source is %, no px math → autos use the naive 100%/3 ≈ 33% fallback path.
      expect(out).toMatch(/width: 33(\.\d+)?%/)
    })

    it('floors the per-auto share to 2 decimals so 3 autos + 2 spacers never overflow the slot', () => {
      /**
       * 576 − (20 + 20) = 536. 536/3 = 178.6̄. Rounding up to 179 would give
       * 3×179 + 2×20 = 577 > 576 → row stacks. Floor-to-2-decimals lands
       * at 178.66, so sum = 535.98 + 40 = 575.98 ≤ 576.
       */
      const html =
        `<div data-maizzle-cw="576px">`
        + col('c1', 5)
        + explicit('s1', 5, 'width: 20px')
        + col('c2', 5)
        + explicit('s2', 5, 'width: 20px')
        + col('c3', 5)
        + `</div>`
      const out = run(html)
      expect(out.match(/width: 178\.66px/g)?.length).toBe(3)
    })

    it('clamps negative remainders to zero rather than going negative', () => {
      const html =
        `<div data-maizzle-cw="100px">`
        + col('c1', 2)
        + explicit('c2', 2, 'width: 200px')
        + `</div>`
      // Explicit takes 200, exceeds source. Auto gets max(0, (100−200)/1) = 0.
      expect(run(html)).toContain('width: 0px')
    })
  })

  it('falls through an unresolvable ancestor marker to the next sized one', () => {
    /**
     * Row emits an empty data-maizzle-cw because a class like `w-typo`
     * tripped the heuristic, but Tailwind dropped the bogus class so
     * no width ends up in style. Columns still resolve via Container.
     */
    const html =
      `<div data-maizzle-cw="" style="max-width: 576px">`
      + `<div data-maizzle-cw="" style="font-size: 0;">${col('c1', 2)}${col('c2', 2)}</div>`
      + `</div>`
    const out = run(html)
    expect(out.match(/width: 288px/g)?.length).toBe(2)
  })

  it('handles percentage widths via division', () => {
    const html = `<div data-maizzle-cw="100%">${col('c1', 4)}</div>`
    expect(run(html)).toContain('width: 25%')
  })

  it('strips the min-width declaration when no source is found', () => {
    const html = `<div>${col('c1', 2)}</div>`
    const out = run(html)
    expect(out).not.toContain('__MAIZZLE_COLW_')
    expect(out).not.toContain('min-width')
    expect(out).toContain('display: inline-block')
    expect(out).toContain('font-size: 16px')
  })

  it('strips data-maizzle-cw* attributes from all elements', () => {
    const html =
      `<div data-maizzle-cw="600px">${col('c1', 2)}</div>`
    const out = run(html)
    expect(out).not.toContain('data-maizzle-cw')
    expect(out).not.toContain('data-maizzle-cw-id')
    expect(out).not.toContain('data-maizzle-cw-count')
  })

  it('cascades resolved widths through nested rows', () => {
    /**
     * Outer Container 400px → 2 cols = 200px each.
     * Inner Row in col[0] → 2 cols = 100px each.
     */
    const html =
      `<div data-maizzle-cw="400px">`
      + `<div>` // Row
      + `<div style="display: inline-block; min-width: __MAIZZLE_COLW_o1__;" data-maizzle-cw-id="o1" data-maizzle-cw-count="2">`
      + `<div>` // nested Row
      + `<div style="display: inline-block; min-width: __MAIZZLE_COLW_n1__;" data-maizzle-cw-id="n1" data-maizzle-cw-count="2"></div>`
      + `<div style="display: inline-block; min-width: __MAIZZLE_COLW_n2__;" data-maizzle-cw-id="n2" data-maizzle-cw-count="2"></div>`
      + `</div>`
      + `</div>`
      + `<div style="display: inline-block; min-width: __MAIZZLE_COLW_o2__;" data-maizzle-cw-id="o2" data-maizzle-cw-count="2"></div>`
      + `</div>`
      + `</div>`
    const out = run(html)
    // Outer columns: 200px
    expect(out.match(/width: 200px/g)?.length).toBe(2)
    // Nested columns: 100px
    expect(out.match(/width: 100px/g)?.length).toBe(2)
  })

  it('is a no-op when no markers are present', () => {
    const html = '<div>plain</div>'
    expect(run(html)).toBe(html)
  })

  describe('MSO comment width substitution', () => {
    const colWithMso = (id: string, count: number) =>
      `<!--[if mso]><td style="width: __MAIZZLE_COLW_${id}__; vertical-align: top"><![endif]-->`
      + col(id, count)
      + `<!--[if mso]></td><![endif]-->`

    it('replaces the MSO td width marker with the resolved px value', () => {
      const html =
        `<div data-maizzle-cw="600px"><div>${colWithMso('c1', 2)}${colWithMso('c2', 2)}</div></div>`
      const out = run(html)
      expect(out.match(/width: 300px/g)?.length).toBeGreaterThanOrEqual(2)
      expect(out).not.toContain('__MAIZZLE_COLW_')
    })

    it('falls back to ${100/count}% when no source ancestor exists', () => {
      const html = `<div>${colWithMso('c1', 2)}${colWithMso('c2', 2)}</div>`
      const out = run(html)
      expect(out).toContain('width: 50%')
      expect(out).not.toContain('__MAIZZLE_COLW_')
    })

    it('falls back to 33% for 3 columns when unresolvable', () => {
      const html = `<div>${colWithMso('c1', 3)}</div>`
      expect(run(html)).toContain('width: 33%')
    })
  })

  describe('non-min-width style markers (Overlap)', () => {
    it('substitutes a width: marker with the resolved px value', () => {
      const html =
        `<div data-maizzle-cw="600px">`
        + `<div data-maizzle-cw-id="o1" data-maizzle-cw-count="1"></div>`
        + `<td style="width: __MAIZZLE_COLW_o1__; max-width: 100%"></td>`
        + `</div>`
      const out = run(html)
      expect(out).toContain('width: 600px')
      expect(out).not.toContain('__MAIZZLE_COLW_')
    })

    it('falls back to 100% for count=1 when no source ancestor exists', () => {
      const html =
        `<div data-maizzle-cw-id="o1" data-maizzle-cw-count="1"></div>`
        + `<td style="width: __MAIZZLE_COLW_o1__"></td>`
      const out = run(html)
      expect(out).toContain('width: 100%')
      expect(out).not.toContain('__MAIZZLE_COLW_')
    })

    it('substitutes the same marker in both style and comment text', () => {
      const html =
        `<div data-maizzle-cw="500px">`
        + `<div data-maizzle-cw-id="o1" data-maizzle-cw-count="1"></div>`
        + `<td style="width: __MAIZZLE_COLW_o1__"></td>`
        + `<!--[if mso]><v:rect style="width: __MAIZZLE_COLW_o1__; height: 200px"><![endif]-->`
        + `</div>`
      const out = run(html)
      expect(out.match(/500px/g)?.length).toBeGreaterThanOrEqual(2)
      expect(out).not.toContain('__MAIZZLE_COLW_')
    })
  })

  describe('self-source width (Overlap with own width class)', () => {
    it('reads width from the marked element\'s own inlined max-width', () => {
      const html =
        `<div data-maizzle-cw-id="o1" data-maizzle-cw-count="1" data-maizzle-cw-self="" style="max-width: 576px"></div>`
        + `<td style="width: __MAIZZLE_COLW_o1__"></td>`
      const out = run(html)
      expect(out).toContain('width: 576px')
      expect(out).not.toContain('__MAIZZLE_COLW_')
      expect(out).not.toContain('data-maizzle-cw-self')
    })

    it('self-source ignores ancestor data-maizzle-cw', () => {
      const html =
        `<div data-maizzle-cw="999px">`
        + `<div data-maizzle-cw-id="o1" data-maizzle-cw-count="1" data-maizzle-cw-self="" style="max-width: 400px"></div>`
        + `<td style="width: __MAIZZLE_COLW_o1__"></td>`
        + `</div>`
      expect(run(html)).toContain('width: 400px')
    })

    it('falls back to 100% when self-source has no inlined width', () => {
      const html =
        `<div data-maizzle-cw-id="o1" data-maizzle-cw-count="1" data-maizzle-cw-self=""></div>`
        + `<td style="width: __MAIZZLE_COLW_o1__"></td>`
      expect(run(html)).toContain('width: 100%')
    })
  })

  describe('overlap height substitution', () => {
    it('reads height from the marked element\'s own inlined height', () => {
      const html =
        `<div data-maizzle-oh-id="o1" style="height: 200px"></div>`
        + `<!--[if mso]><v:rect style="width: 600px; height: __MAIZZLE_OH_o1__"><![endif]-->`
      const out = run(html)
      expect(out).toContain('height: 200px')
      expect(out).not.toContain('__MAIZZLE_OH_')
      expect(out).not.toContain('data-maizzle-oh-id')
    })

    it('reads max-height when height is absent', () => {
      const html =
        `<div data-maizzle-oh-id="o1" style="max-height: 12.5rem"></div>`
        + `<!--[if mso]><v:rect style="height: __MAIZZLE_OH_o1__"><![endif]-->`
      // 12.5rem → 200px
      expect(run(html)).toContain('height: 200px')
    })

    it('falls back to 100% when no height source is found', () => {
      const html = `<!--[if mso]><v:rect style="height: __MAIZZLE_OH_o1__"><![endif]-->`
      expect(run(html)).toContain('height: 100%')
    })
  })
})

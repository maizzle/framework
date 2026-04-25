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
    expect(out).toContain('min-width: 300px')
    expect(out).not.toContain('__MAIZZLE_COLW_')
    expect(out).not.toContain('data-maizzle-cw')
  })

  it('reads max-width from the parent style when data-maizzle-cw is empty', () => {
    const html = `<div data-maizzle-cw="" style="max-width: 576px">${col('c1', 2)}${col('c2', 2)}</div>`
    expect(run(html)).toContain('min-width: 288px')
  })

  it('reads width from the parent style when max-width is absent', () => {
    const html = `<div data-maizzle-cw="" style="width: 480px">${col('c1', 3)}</div>`
    expect(run(html)).toContain('min-width: 160px')
  })

  it('walks up past intermediate elements without data-maizzle-cw', () => {
    const html =
      `<div data-maizzle-cw="600px"><div><div>${col('c1', 2)}</div></div></div>`
    expect(run(html)).toContain('min-width: 300px')
  })

  it('uses the nearest sized ancestor (Section over Container)', () => {
    const html =
      `<div data-maizzle-cw="600px">`
      + `<div data-maizzle-cw="400px">${col('c1', 2)}</div>`
      + `</div>`
    expect(run(html)).toContain('min-width: 200px')
  })

  it('handles percentage widths via division', () => {
    const html = `<div data-maizzle-cw="100%">${col('c1', 4)}</div>`
    expect(run(html)).toContain('min-width: 25%')
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
    // Outer Container 400px → 2 cols = 200px each
    // Inner Row inside col[0] → 2 cols = 100px each
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
    expect(out.match(/min-width: 200px/g)?.length).toBe(2)
    // Nested columns: 100px
    expect(out.match(/min-width: 100px/g)?.length).toBe(2)
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

import { describe, it, expect } from 'vitest'
import { imgWidthDom } from '../../transformers/imgWidth.ts'
import { parse, serialize } from '../../utils/ast/index.ts'

function run(html: string): string {
  return serialize(imgWidthDom(parse(html)))
}

const marked = (extra = '') => `<img src="x.jpg"${extra} data-maizzle-img-width class="i">`

describe('imgWidth', () => {
  it('backfills width from an ancestor max-width', () => {
    const result = run(`<div style="max-width: 600px">${marked()}</div>`)
    expect(result).toContain('width="600"')
    expect(result).not.toContain('data-maizzle-img-width')
  })

  it('backfills width from an ancestor width', () => {
    const result = run(`<div style="width: 480px">${marked()}</div>`)
    expect(result).toContain('width="480"')
  })

  it('backfills width from an ancestor width attribute', () => {
    const result = run(`<table width="600"><tr><td>${marked()}</td></tr></table>`)
    expect(result).toContain('width="600"')
  })

  it('subtracts ancestor horizontal padding and border', () => {
    const result = run(`<div style="max-width: 600px; padding: 0 20px; border-left: 5px solid #000">${marked()}</div>`)
    // 600 - (20 + 20) - 5 = 555
    expect(result).toContain('width="555"')
  })

  it('uses the nearest sized ancestor', () => {
    const result = run(`<div style="max-width: 600px"><div style="max-width: 300px">${marked()}</div></div>`)
    expect(result).toContain('width="300"')
  })

  it('leaves the image fluid when only a percentage width is available', () => {
    const result = run(`<div style="max-width: 100%">${marked()}</div>`)
    expect(result).not.toContain('width=')
    expect(result).not.toContain('data-maizzle-img-width')
  })

  it('leaves the image fluid when no ancestor has a width', () => {
    const result = run(`<div>${marked()}</div>`)
    expect(result).not.toContain('width=')
    expect(result).not.toContain('data-maizzle-img-width')
  })

  it('ignores images without the marker', () => {
    const html = '<div style="max-width: 600px"><img src="x.jpg" class="i"></div>'
    expect(run(html)).toBe(html)
  })

  it('skips a percentage ancestor and uses a sized one further up', () => {
    const result = run(`<div style="max-width: 600px"><div style="max-width: 100%">${marked()}</div></div>`)
    expect(result).toContain('width="600"')
  })
})

import { describe, it, expect } from 'vitest'
import { format, type FormatOptions } from '../../transformers/format.ts'

async function run(html: string, option?: boolean | FormatOptions): Promise<string> {
  if (option === false) return html
  const opts = (option === true || option == null) ? {} : option
  return format(html, opts)
}

/**
 * Core feature — indents HTML
 */

describe('format', () => {
  it('indents nested HTML elements', async () => {
    const html = `<html><body><p>hello</p></body></html>`
    const result = await run(html, true)
    expect(result).toContain('\n')
    expect(result).toMatch(/<body>\s+<p>/)
  })

  it('preserves all content', async () => {
    const html = `<html><head><style>.foo{color:red}</style></head><body><p class="foo">hi</p></body></html>`
    const result = await run(html, true)
    expect(result).toContain('.foo')
    expect(result).toContain('color:red')
    expect(result).toContain('class="foo"')
    expect(result).toContain('hi')
  })

  /**
   * Custom options — user values win
   */

  it('uses tabs when useTabs is set', async () => {
    const html = `<html><body><p>hi</p></body></html>`
    const result = await run(html, { useTabs: true })
    expect(result).toContain('\t')
  })

  it('respects custom tabWidth', async () => {
    const html = `<html><body><p>hi</p></body></html>`
    const result = await run(html, { tabWidth: 4 })
    // With tabWidth: 4 the body content should be indented with 4 spaces
    expect(result).toMatch(/^ {4}/m)
  })

  it('respects singleAttributePerLine', async () => {
    const html = `<html><body><div class="foo" id="bar"><p>hi</p></div></body></html>`
    const result = await run(html, { singleAttributePerLine: true })
    // Each attribute on its own line
    expect(result).toMatch(/class="foo"\n/)
    expect(result).toMatch(/id="bar"\n/)
  })

  /**
   * Formatting normalization
   */

  it('condenses multiple blank lines', async () => {
    const html = `<html><body>\n\n\n<p>hi</p>\n\n\n</body></html>`
    const result = await run(html, true)
    expect(result).not.toMatch(/\n{3,}/)
  })

  it('trims leading whitespace', async () => {
    const html = `   <html><body><p>hi</p></body></html>`
    const result = await run(html, true)
    expect(result).not.toMatch(/^\s+/)
  })

  /**
   * Disabled / short-circuit
   */

})

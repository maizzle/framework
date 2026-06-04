import { describe, it, expect, vi } from 'vitest'

// juice almost never throws on real input; mock it to exercise the
// defensive catch that returns the DOM unchanged.
vi.mock('juice', () => ({
  default: Object.assign(
    () => { throw new Error('juice failed') },
    { styleToAttribute: {}, excludedProperties: [], widthElements: [], heightElements: [], codeBlocks: {} },
  ),
}))

const { inlineCss } = await import('../../transformers/inlineCss.ts')

describe('inlineCss error handling', () => {
  it('returns the markup uninlined when juice throws', () => {
    const html = '<style>.a{color:red}</style><p class="a">hi</p>'
    const result = inlineCss(html)

    expect(result).toContain('<style>')
    expect(result).toContain('class="a"')
    expect(result).not.toContain('style="color')
  })
})

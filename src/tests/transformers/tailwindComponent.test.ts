import { describe, it, expect } from 'vitest'
import { tailwindComponent } from '../../transformers/tailwindComponent.ts'
import { parse, serialize } from '../../utils/ast/index.ts'

describe('tailwindComponent', () => {
  it('returns the DOM unchanged when there are no blocks', async () => {
    const dom = parse('<div>x</div>')
    expect(await tailwindComponent(dom, [], {})).toBe(dom)
  })

  it('throws when no <head> element is present', async () => {
    await expect(
      tailwindComponent(parse('<body><div>x</div></body>'), [{ id: 'b1' }], {}),
    ).rejects.toThrow('requires `Head` component')
  })

  it('injects no <style> when a block compiles to empty CSS', async () => {
    const dom = parse('<head></head><!--mz-tw:b1--><div></div><!--/mz-tw:b1-->')
    const out = serialize(await tailwindComponent(dom, [{ id: 'b1', css: '' }], {}))
    expect(out).not.toContain('<style')
    expect(out).not.toContain('mz-tw:')
  })

  it('ignores an open marker for an unregistered block', async () => {
    const dom = parse('<head></head><!--mz-tw:ghost--><div class="text-red-500"></div><!--/mz-tw:ghost-->')
    const out = serialize(await tailwindComponent(dom, [{ id: 'b1', css: '' }], {}))
    expect(out).not.toContain('mz-tw:')
    // ghost was never pushed, so the class was not collected anywhere
    expect(out).not.toContain('color: #')
  })

  it('ignores a close marker that does not match the open stack', async () => {
    const dom = parse('<head></head><!--mz-tw:a--><!--/mz-tw:b-->')
    const out = serialize(await tailwindComponent(dom, [{ id: 'a', css: '' }, { id: 'b', css: '' }], {}))
    expect(out).not.toContain('mz-tw:')
  })
})

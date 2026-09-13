import { describe, it, expect } from 'vitest'
import { msoConditionals } from '../../transformers/msoConditionals.ts'

describe('msoConditionals', () => {
  it('collapses an open/close placeholder pair into one conditional comment', () => {
    const html = '<!--[if mso]>__MAIZZLE_MSO_OPEN__<![endif]--><p>x</p><!--[if mso]>__MAIZZLE_MSO_CLOSE__<![endif]-->'
    expect(msoConditionals(html)).toBe('<!--[if mso]><p>x</p><![endif]-->')
  })

  it('keeps the condition of the opening placeholder', () => {
    const html = '<!--[if (gt mso 11)&(lt mso 16)]>__MAIZZLE_MSO_OPEN__<![endif]-->x<!--[if mso]>__MAIZZLE_MSO_CLOSE__<![endif]-->'
    expect(msoConditionals(html)).toBe('<!--[if (gt mso 11)&(lt mso 16)]>x<![endif]-->')
  })

  it('leaves regular conditional comments untouched', () => {
    const html = '<!--[if mso]><p>a</p><![endif]--><!--[if !mso]><!--><p>b</p><!--<![endif]-->'
    expect(msoConditionals(html)).toBe(html)
  })
})

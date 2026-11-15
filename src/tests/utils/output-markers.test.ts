import { describe, it, expect } from 'vitest'
import { outputMarkers, stripForHtml, stripForPlaintext } from '../../utils/output-markers.ts'
import type { RenderContext } from '../../composables/renderContext.ts'

function setup() {
  const ctx: RenderContext = { sfcEventHandlers: [] }
  const wrap = (kind: 'PT' | 'HO', content: string) => {
    const [start, end] = outputMarkers(ctx, kind)
    return `${start}${content}${end}`
  }
  return { ctx, pt: (c: string) => wrap('PT', c), ho: (c: string) => wrap('HO', c) }
}

describe('output-markers', () => {
  describe('outputMarkers', () => {
    it('uses one nonce per render and a unique id per block', () => {
      const ctx: RenderContext = { sfcEventHandlers: [] }
      const [s1, e1] = outputMarkers(ctx, 'PT')
      const [s2] = outputMarkers(ctx, 'HO')

      expect(ctx.nonce).toMatch(/^[a-f0-9]{32}$/)
      expect(s1).toBe(`__MZPT_${ctx.nonce}_1_S__`)
      expect(e1).toBe(`__MZPT_${ctx.nonce}_1_E__`)
      expect(s2).toBe(`__MZHO_${ctx.nonce}_2_S__`)
    })

    it('uses a different nonce for each render', () => {
      const a: RenderContext = { sfcEventHandlers: [] }
      const b: RenderContext = { sfcEventHandlers: [] }
      outputMarkers(a, 'PT')
      outputMarkers(b, 'PT')

      expect(a.nonce).not.toBe(b.nonce)
    })
  })

  describe('stripForHtml', () => {
    it('drops plaintext-only blocks', () => {
      const { ctx, pt } = setup()
      const out = stripForHtml(`<p>before</p>${pt('<span>secret</span>')}<p>after</p>`, ctx.nonce)

      expect(out).toBe('<p>before</p><p>after</p>')
    })

    it('keeps html-only content, removing its markers', () => {
      const { ctx, ho } = setup()
      const out = stripForHtml(ho('<span>visible</span>'), ctx.nonce)

      expect(out).toBe('<span>visible</span>')
    })

    it('leaves everything else untouched', () => {
      const { ctx, ho } = setup()
      const html = `<p>a&nbsp;b &mdash; c&zwj;</p>\n  <a href="a">{% if x > 1 %}<a href="b">${ho('x')}`
      const out = stripForHtml(html, ctx.nonce)

      expect(out).toBe('<p>a&nbsp;b &mdash; c&zwj;</p>\n  <a href="a">{% if x > 1 %}<a href="b">x')
    })

    it('drops nested blocks with the outer plaintext-only block', () => {
      const { ctx, pt, ho } = setup()
      const out = stripForHtml(`a${pt(`b${ho('c')}${pt('d')}e`)}f`, ctx.nonce)

      expect(out).toBe('af')
    })

    it('returns input unchanged without a nonce', () => {
      const html = '<p>no markers</p>'
      expect(stripForHtml(html)).toBe(html)
    })

    it('ignores markers with a different nonce', () => {
      const { ctx } = setup()
      const forged = '__MZPT_0_1_S__keep__MZPT_0_1_E__'
      outputMarkers(ctx, 'PT')

      expect(stripForHtml(forged, ctx.nonce)).toBe(forged)
    })
  })

  describe('stripForPlaintext', () => {
    it('drops html-only blocks', () => {
      const { ctx, ho } = setup()
      const out = stripForPlaintext(`<p>shared</p>${ho('<span>html-only</span>')}`, ctx.nonce)

      expect(out).toBe('<p>shared</p>')
    })

    it('keeps plaintext-only content, removing its markers', () => {
      const { ctx, pt } = setup()
      const out = stripForPlaintext(pt('<a href="/x">y</a>'), ctx.nonce)

      expect(out).toBe('<a href="/x">y</a>')
    })

    it('drops nested blocks with the outer html-only block', () => {
      const { ctx, pt, ho } = setup()
      const out = stripForPlaintext(`a${ho(`b${pt('c')}`)}d`, ctx.nonce)

      expect(out).toBe('ad')
    })
  })

  describe('symmetry', () => {
    it('routes sibling Plaintext + NotPlaintext content to opposite outputs', () => {
      const { ctx, pt, ho } = setup()
      const html = `${pt('only-pt')}${ho('only-html')}`

      expect(stripForHtml(html, ctx.nonce)).toBe('only-html')
      expect(stripForPlaintext(html, ctx.nonce)).toBe('only-pt')
    })
  })
})

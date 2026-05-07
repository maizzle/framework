import { describe, it, expect } from 'vitest'
import { sixHex } from '../../transformers/sixHex.ts'

const run = (html: string) => sixHex(html)

describe('sixHex', () => {
  describe('basic', () => {
    it('expands 3-digit hex in bgcolor', () => {
      expect(run('<td bgcolor="#fff"></td>')).toBe('<td bgcolor="#ffffff"></td>')
    })

    it('expands 3-digit hex in color', () => {
      expect(run('<font color="#000">test</font>')).toBe('<font color="#000000">test</font>')
    })

    it('expands mixed-case hex', () => {
      expect(run('<td bgcolor="#fFa"></td>')).toBe('<td bgcolor="#ffffaa"></td>')
    })

    it('leaves 6-digit hex unchanged', () => {
      const html = '<td bgcolor="#ffffff"></td>'
      expect(run(html)).toBe(html)
    })

    it('leaves non-hex values unchanged', () => {
      const html = '<td bgcolor="red"></td>'
      expect(run(html)).toBe(html)
    })

    it('handles both attributes on same element', () => {
      expect(run('<font bgcolor="#abc" color="#def">test</font>'))
        .toBe('<font bgcolor="#aabbcc" color="#ddeeff">test</font>')
    })
  })

  describe('edge cases', () => {
    it('handles empty HTML', () => {
      expect(run('')).toBe('')
    })

    it('ignores elements without target attributes', () => {
      const html = '<td style="color: #fff"></td>'
      expect(run(html)).toBe(html)
    })

    it('handles nested elements', () => {
      expect(run('<table><tr><td bgcolor="#abc"><font color="#def">test</font></td></tr></table>'))
        .toBe('<table><tr><td bgcolor="#aabbcc"><font color="#ddeeff">test</font></td></tr></table>')
    })

    it('does not expand 2-digit or 4-digit values', () => {
      const html = '<td bgcolor="#ff"></td>'
      expect(run(html)).toBe(html)
    })
  })
})

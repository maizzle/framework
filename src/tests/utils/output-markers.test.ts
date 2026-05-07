import { describe, it, expect } from 'vitest'
import { stripForHtml, stripForPlaintext } from '../../utils/output-markers.ts'

describe('output-markers', () => {
  describe('stripForHtml', () => {
    it('drops [data-maizzle-plaintext-only] subtrees', () => {
      const html = '<p>before</p><div data-maizzle-plaintext-only><span>secret</span></div><p>after</p>'
      const out = stripForHtml(html)

      expect(out).toContain('before')
      expect(out).toContain('after')
      expect(out).not.toContain('secret')
      expect(out).not.toContain('data-maizzle-plaintext-only')
    })

    it('unwraps [data-maizzle-html-only] wrappers, keeping children', () => {
      const html = '<div data-maizzle-html-only><span>visible</span></div>'
      const out = stripForHtml(html)

      expect(out).toContain('<span>visible</span>')
      expect(out).not.toContain('data-maizzle-html-only')
    })

    it('handles nested opposite-marker — outer drop wins', () => {
      const html = '<div data-maizzle-plaintext-only><div data-maizzle-html-only>z</div></div>'
      const out = stripForHtml(html)

      expect(out).not.toContain('z')
    })

    it('preserves unrelated content untouched', () => {
      const html = '<table><tr><td><a href="/x">link</a></td></tr></table>'
      const out = stripForHtml(html)

      expect(out).toBe(html)
    })
  })

  describe('stripForPlaintext', () => {
    it('drops [data-maizzle-html-only] subtrees', () => {
      const html = '<p>shared</p><div data-maizzle-html-only><span>html-only</span></div>'
      const out = stripForPlaintext(html)

      expect(out).toContain('shared')
      expect(out).not.toContain('html-only')
      expect(out).not.toContain('data-maizzle-html-only')
    })

    it('unwraps [data-maizzle-plaintext-only] wrappers, keeping children', () => {
      const html = '<div data-maizzle-plaintext-only><a href="/x">y</a></div>'
      const out = stripForPlaintext(html)

      expect(out).toContain('<a href="/x">y</a>')
      expect(out).not.toContain('data-maizzle-plaintext-only')
    })
  })

  describe('symmetry', () => {
    it('routes sibling Plaintext + NotPlaintext content to opposite outputs', () => {
      const html = '<div data-maizzle-plaintext-only>only-pt</div><div data-maizzle-html-only>only-html</div>'

      const htmlOut = stripForHtml(html)
      const ptOut = stripForPlaintext(html)

      expect(htmlOut).not.toContain('only-pt')
      expect(htmlOut).toContain('only-html')

      expect(ptOut).toContain('only-pt')
      expect(ptOut).not.toContain('only-html')
    })
  })
})

import { describe, it, expect } from 'vitest'
import { minify } from '../../transformers/minify.ts'
import type { MaizzleConfig } from '../../types/config.ts'

function run(html: string, config: MaizzleConfig = {}): string {
  return minify(html, config)
}

describe('minify', () => {
  describe('core — removeLineBreaks (default)', () => {
    it('removes line breaks between tags', () => {
      const html = '<div>\n  <p>Hello</p>\n</div>'
      const result = run(html, { html: { minify: true } })
      expect(result).not.toContain('\n')
    })

    it('collapses indentation between tags', () => {
      const html = '<table>\n  <tr>\n    <td>Hello</td>\n  </tr>\n</table>'
      const result = run(html, { html: { minify: true } })
      // html-crush breaks before closing tags per breakToTheLeftOf defaults,
      // but removes leading indentation whitespace
      expect(result).not.toContain('  <tr>')
      expect(result).not.toContain('    <td>')
      expect(result).toContain('Hello')
      expect(result).toContain('</td>')
    })

    it('preserves tag content', () => {
      const html = '<p>Hello World</p>'
      const result = run(html, { html: { minify: true } })
      expect(result).toContain('Hello World')
    })

    it('preserves style tag contents', () => {
      const html = '<style>.foo { color: red; }</style>\n<div class="foo">Hi</div>'
      const result = run(html, { html: { minify: true } })
      expect(result).toContain('.foo')
      expect(result).toContain('color:red')
    })
  })

  describe('config: enabled', () => {
    it('minifies when minify: true', () => {
      const html = '<div>\n  <p>Hello</p>\n</div>'
      expect(run(html, { html: { minify: true } })).not.toContain('\n')
    })

    it('minifies when minify is an options object', () => {
      const html = '<div>\n  <p>Hello</p>\n</div>'
      expect(run(html, { html: { minify: {} } })).not.toContain('\n')
    })
  })

  describe('config: disabled', () => {
    it('returns input unchanged when minify is false', () => {
      const html = '<div>\n  <p>Hello</p>\n</div>'
      expect(run(html, { html: { minify: false } })).toBe(html)
    })

    it('returns input unchanged when minify is not set', () => {
      const html = '<div>\n  <p>Hello</p>\n</div>'
      expect(run(html, {})).toBe(html)
    })
  })

  describe('config: custom options', () => {
    it('keeps line breaks when removeLineBreaks is overridden to false', () => {
      const html = '<div>\n  <p>Hello</p>\n</div>'
      const result = run(html, { html: { minify: { removeLineBreaks: false } } })
      expect(result).toContain('\n')
    })

    it('removes HTML comments when removeHTMLComments: 1', () => {
      const html = '<div><!-- a comment --><p>Hello</p></div>'
      const result = run(html, { html: { minify: { removeHTMLComments: 1 } } })
      expect(result).not.toContain('<!-- a comment -->')
      expect(result).toContain('Hello')
    })

    it('preserves Outlook conditional comments when removeHTMLComments: 1', () => {
      const html = '<!--[if mso]><v:rect></v:rect><![endif]--><p>Hello</p>'
      const result = run(html, { html: { minify: { removeHTMLComments: 1 } } })
      expect(result).toContain('<!--[if mso]>')
    })

    it('removes all HTML comments including Outlook when removeHTMLComments: 2', () => {
      const html = '<!--[if mso]><v:rect></v:rect><![endif]--><p>Hello</p>'
      const result = run(html, { html: { minify: { removeHTMLComments: 2 } } })
      expect(result).not.toContain('<!--[if mso]>')
      expect(result).toContain('Hello')
    })

    it('keeps CSS comments when removeCSSComments is false', () => {
      const html = '<style>/* my comment */ .foo { color: red; }</style>'
      const result = run(html, { html: { minify: { removeCSSComments: false } } })
      expect(result).toContain('/* my comment */')
    })
  })

  describe('short-circuit', () => {
    it('returns original string when minify is not set', () => {
      const html = '<div>Hello</div>'
      expect(run(html)).toBe(html)
    })

    it('returns original string when minify is false', () => {
      const html = '<div>Hello</div>'
      expect(run(html, { html: { minify: false } })).toBe(html)
    })

    it('handles empty string', () => {
      expect(run('', { html: { minify: true } })).toBe('')
    })
  })
})

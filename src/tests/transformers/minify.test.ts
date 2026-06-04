import { describe, it, expect } from 'vitest'
import { minify, type MinifyOptions } from '../../transformers/minify.ts'

function run(html: string, options?: boolean | Partial<MinifyOptions>): string {
  if (options === false) return html
  const opts = (options === true || options == null) ? {} : options
  return minify(html, opts)
}

describe('minify', () => {
  describe('core — removeLineBreaks (default)', () => {
    it('removes line breaks between tags', () => {
      const html = '<div>\n  <p>Hello</p>\n</div>'
      const result = run(html, true)
      expect(result).not.toContain('\n')
    })

    it('collapses indentation between tags', () => {
      const html = '<table>\n  <tr>\n    <td>Hello</td>\n  </tr>\n</table>'
      const result = run(html, true)
      /**
       * html-crush breaks before closing tags per breakToTheLeftOf
       * defaults, but removes leading indentation whitespace.
       */
      expect(result).not.toContain('  <tr>')
      expect(result).not.toContain('    <td>')
      expect(result).toContain('Hello')
      expect(result).toContain('</td>')
    })

    it('preserves tag content', () => {
      const html = '<p>Hello World</p>'
      const result = run(html, true)
      expect(result).toContain('Hello World')
    })

    it('preserves style tag contents', () => {
      const html = '<style>.foo { color: red; }</style>\n<div class="foo">Hi</div>'
      const result = run(html, true)
      expect(result).toContain('.foo')
      expect(result).toContain('color:red')
    })
  })

  describe('options', () => {
    it('minifies when called with no options', () => {
      const html = '<div>\n  <p>Hello</p>\n</div>'
      expect(minify(html)).not.toContain('\n')
    })

    it('minifies when called with an options object', () => {
      const html = '<div>\n  <p>Hello</p>\n</div>'
      expect(run(html, {})).not.toContain('\n')
    })

    it('keeps line breaks when removeLineBreaks is overridden to false', () => {
      const html = '<div>\n  <p>Hello</p>\n</div>'
      const result = run(html, { removeLineBreaks: false })
      expect(result).toContain('\n')
    })

    it('removes HTML comments when removeHTMLComments: 1', () => {
      const html = '<div><!-- a comment --><p>Hello</p></div>'
      const result = run(html, { removeHTMLComments: 1 })
      expect(result).not.toContain('<!-- a comment -->')
      expect(result).toContain('Hello')
    })

    it('preserves Outlook conditional comments when removeHTMLComments: 1', () => {
      const html = '<!--[if mso]><v:rect></v:rect><![endif]--><p>Hello</p>'
      const result = run(html, { removeHTMLComments: 1 })
      expect(result).toContain('<!--[if mso]>')
    })

    it('removes all HTML comments including Outlook when removeHTMLComments: 2', () => {
      const html = '<!--[if mso]><v:rect></v:rect><![endif]--><p>Hello</p>'
      const result = run(html, { removeHTMLComments: 2 })
      expect(result).not.toContain('<!--[if mso]>')
      expect(result).toContain('Hello')
    })

    it('keeps CSS comments when removeCSSComments is false', () => {
      const html = '<style>/* my comment */ .foo { color: red; }</style>'
      const result = run(html, { removeCSSComments: false })
      expect(result).toContain('/* my comment */')
    })
  })

  describe('edge cases', () => {
    it('handles empty string', () => {
      expect(minify('')).toBe('')
    })
  })
})

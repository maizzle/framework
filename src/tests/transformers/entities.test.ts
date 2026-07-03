import { describe, it, expect } from 'vitest'
import { entities } from '../../transformers/entities.ts'
import type { EntitiesConfig } from '../../types/config.ts'

function run(html: string, decodeEntities?: EntitiesConfig): string {
  return entities(html, decodeEntities)
}

describe('entities', () => {
  describe('config: disabled', () => {
    it('encodes entities by default when decodeEntities is undefined', () => {
      const html = '<p>Hello\u00A0world</p>'
      const result = run(html, undefined)
      expect(result).toBe('<p>Hello&nbsp;world</p>')
    })

    it('returns unchanged when decodeEntities is false', () => {
      const html = '<p>Hello\u00A0world</p>'
      const result = run(html, false)
      expect(result).toBe(html)
    })
  })

  describe('config: enabled with true', () => {
    it('uses default entity map when set to true', () => {
      const result = run('<p>\u00A0</p>', true)
      expect(result).toBe('<p>&nbsp;</p>')
    })
  })

  describe('default entity replacements', () => {
    it('replaces zero-width joiner', () => {
      const result = run('<p>\u200D</p>', true)
      expect(result).toBe('<p>&zwj;</p>')
    })

    it('replaces ZWNBSP (BOM) with &#65279;', () => {
      const result = run('<p>\uFEFF</p>', true)
      expect(result).toBe('<p>&#65279;</p>')
    })
  })

  describe('multiple replacements', () => {
    it('replaces multiple different entities in one pass', () => {
      const result = run('<p>\u00A0\u2014\u2022</p>', true)
      expect(result).toBe('<p>&nbsp;&mdash;&bull;</p>')
    })

    it('replaces multiple occurrences of the same entity', () => {
      const result = run('<p>\u00A0\u00A0\u00A0</p>', true)
      expect(result).toBe('<p>&nbsp;&nbsp;&nbsp;</p>')
    })

    it('replaces entities across multiple text nodes', () => {
      const result = run('<p>\u00A0</p><p>\u2014</p>', true)
      expect(result).toBe('<p>&nbsp;</p><p>&mdash;</p>')
    })
  })

  describe('element coverage', () => {
    it('processes text in nested elements', () => {
      const result = run('<div><span>\u00A0</span></div>', true)
      expect(result).toBe('<div><span>&nbsp;</span></div>')
    })

    it('processes text in deeply nested structures', () => {
      const result = run('<table><tr><td>\u2022 item</td></tr></table>', true)
      expect(result).toBe('<table><tr><td>&bull; item</td></tr></table>')
    })

    it('only processes text nodes, not attributes', () => {
      const result = run('<div title="\u00A0">\u00A0</div>', true)
      expect(result).toContain('>&nbsp;<')
      // Attribute should remain unchanged (unicode char or already encoded)
      expect(result).toMatch(/title="[^"]*"/)
    })
  })

  describe('config: custom overrides', () => {
    it('user entity overrides a default', () => {
      const result = run('<p>\u00A0</p>', {
        '\u00A0': '&custom_nbsp;',
      })
      expect(result).toBe('<p>&custom_nbsp;</p>')
    })

    it('user adds a new entity while keeping defaults', () => {
      const result = run('<p>\u00A9\u00A0</p>', {
        '\u00A9': '&copy;',
      })
      expect(result).toBe('<p>&copy;&nbsp;</p>')
    })

    it('user overrides one default, others still apply', () => {
      const result = run('<p>\u2014\u2013</p>', {
        '\u2014': '---',
      })
      expect(result).toBe('<p>---&ndash;</p>')
    })

    it('empty custom map still uses all defaults', () => {
      const result = run('<p>\u00A0</p>', {})
      expect(result).toBe('<p>&nbsp;</p>')
    })
  })

  describe('short-circuit', () => {
    it('returns serialized HTML even when no entities are found', () => {
      const html = '<p>Plain text</p>'
      const result = run(html, true)
      expect(result).toBe('<p>Plain text</p>')
    })

    it('preserves normal text content', () => {
      const html = '<p>Hello world</p>'
      const result = run(html, true)
      expect(result).toBe(html)
    })
  })

  describe('comment nodes', () => {
    it('encodes entities inside comments by default', () => {
      const result = run('<!--[if mso]>\u00A0\u00A0<![endif]-->', true)
      expect(result).toBe('<!--[if mso]>&nbsp;&nbsp;<![endif]-->')
    })

    it('encodes comments regardless of conditional syntax', () => {
      const result = run('<!-- \u00A0 -->', true)
      expect(result).toBe('<!-- &nbsp; -->')
    })

    it('scope.comments false leaves comments untouched', () => {
      const html = '<!--[if mso]>\u00A0<![endif]--><p>\u00A0</p>'
      const result = entities(html, true, { comments: false })
      expect(result).toBe('<!--[if mso]>\u00A0<![endif]--><p>&nbsp;</p>')
    })

    it('scope.text false leaves text nodes untouched', () => {
      const html = '<!--[if mso]>\u00A0<![endif]--><p>\u00A0</p>'
      const result = entities(html, true, { text: false })
      expect(result).toBe('<!--[if mso]>&nbsp;<![endif]--><p>\u00A0</p>')
    })
  })

  describe('edge cases', () => {
    it('handles empty HTML', () => {
      const result = run('', true)
      expect(result).toBe('')
    })

    it('handles text-only input (no tags)', () => {
      const result = run('\u00A0', true)
      expect(result).toBe('&nbsp;')
    })

    it('handles entity next to regular text', () => {
      const result = run('<p>Price:\u00A020\u20AC</p>', {
        '\u20AC': '&euro;',
      })
      expect(result).toBe('<p>Price:&nbsp;20&euro;</p>')
    })

    it('handles entities at start and end of text', () => {
      const result = run('<p>\u201CHello\u201D</p>', true)
      expect(result).toBe('<p>&ldquo;Hello&rdquo;</p>')
    })
  })
})

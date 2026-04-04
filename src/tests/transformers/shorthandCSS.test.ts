import { describe, it, expect } from 'vitest'
import { shorthandCSS } from '../../transformers/shorthandCSS.ts'
import { parse, serialize } from '../../utils/ast/index.ts'
import type { CssConfig } from '../../types/config.ts'

function run(html: string, shorthand?: boolean | { tags?: string[] }): string {
  return serialize(shorthandCSS(parse(html), { shorthand } satisfies CssConfig))
}

describe('shorthandCSS', () => {
  describe('config: css.shorthand', () => {
    it('returns unchanged when shorthand is not set', () => {
      const html = '<p style="margin-top: 4px; margin-bottom: 4px;">Text</p>'
      expect(serialize(shorthandCSS(parse(html), {}))).toBe(html)
    })

    it('returns unchanged when shorthand is false', () => {
      const html = '<p style="margin-top: 4px; margin-bottom: 4px;">Text</p>'
      expect(run(html, false)).toBe(html)
    })

    it('converts longhand to shorthand when enabled', () => {
      const html = '<p style="margin-top: 4px; margin-bottom: 4px; margin-left: 2px; margin-right: 2px;">Text</p>'
      const result = run(html, true)
      expect(result).toContain('margin:')
      expect(result).not.toContain('margin-top:')
      expect(result).not.toContain('margin-bottom:')
      expect(result).not.toContain('margin-left:')
      expect(result).not.toContain('margin-right:')
    })
  })

  describe('margin shorthand', () => {
    it('converts margin longhand to shorthand', () => {
      const html = '<p style="margin-top: 10px; margin-right: 20px; margin-bottom: 10px; margin-left: 20px;">Text</p>'
      const result = run(html, true)
      expect(result).toContain('margin:')
      expect(result).not.toContain('margin-top:')
    })

    it('handles equal margins on all sides', () => {
      const html = '<p style="margin-top: 5px; margin-right: 5px; margin-bottom: 5px; margin-left: 5px;">Text</p>'
      const result = run(html, true)
      expect(result).toContain('margin:')
      expect(result).not.toContain('margin-top:')
    })

    it('handles vertical/horizontal shorthand', () => {
      const html = '<p style="margin-top: 10px; margin-bottom: 10px; margin-left: 5px; margin-right: 5px;">Text</p>'
      const result = run(html, true)
      expect(result).toContain('margin:')
      expect(result).not.toContain('margin-top:')
    })
  })

  describe('padding shorthand', () => {
    it('converts padding longhand to shorthand', () => {
      const html = '<p style="padding-top: 10px; padding-right: 20px; padding-bottom: 10px; padding-left: 20px;">Text</p>'
      const result = run(html, true)
      expect(result).toContain('padding:')
      expect(result).not.toContain('padding-top:')
    })

    it('handles equal padding on all sides', () => {
      const html = '<p style="padding-top: 5px; padding-right: 5px; padding-bottom: 5px; padding-left: 5px;">Text</p>'
      const result = run(html, true)
      expect(result).toContain('padding:')
      expect(result).not.toContain('padding-top:')
    })
  })

  describe('border shorthand', () => {
    it('converts border longhand to shorthand', () => {
      const html = '<p style="border-width: 1px; border-style: solid; border-color: #000;">Text</p>'
      const result = run(html, true)
      expect(result).toContain('border:')
      expect(result).not.toContain('border-width:')
      expect(result).not.toContain('border-style:')
      expect(result).not.toContain('border-color:')
    })
  })

  describe('tag filtering', () => {
    it('processes only specified tags when tags filter is set', () => {
      const html = '<p style="margin-top: 4px; margin-bottom: 4px; margin-left: 2px; margin-right: 2px;">A</p><div style="margin-top: 4px; margin-bottom: 4px; margin-left: 2px; margin-right: 2px;">B</div>'
      const result = run(html, { tags: ['div'] })
      // p should remain unchanged, div should be converted
      expect(result).toContain('margin-top:')
      expect(result).toContain('margin:')
    })

    it('handles multiple allowed tags', () => {
      const html = '<p style="margin-top: 4px; margin-bottom: 4px; margin-left: 2px; margin-right: 2px;">A</p><div style="margin-top: 4px; margin-bottom: 4px; margin-left: 2px; margin-right: 2px;">B</div><span style="margin-top: 4px; margin-bottom: 4px; margin-left: 2px; margin-right: 2px;">C</span>'
      const result = run(html, { tags: ['p', 'div'] })
      expect(result).toContain('<p style="margin:')
      expect(result).toContain('<div style="margin:')
      expect(result).toContain('<span style="margin-top:')
    })
  })

  describe('edge cases', () => {
    it('handles elements without style attribute', () => {
      const html = '<p>Text</p>'
      const result = run(html, true)
      expect(result).toBe('<p>Text</p>')
    })

    it('handles empty style attribute', () => {
      const html = '<p style="">Text</p>'
      const result = run(html, true)
      expect(result).toBe('<p style>Text</p>')
    })

    it('handles invalid CSS gracefully', () => {
      const html = '<p style="margin-top: invalid;">Text</p>'
      const result = run(html, true)
      // Should return original or handle gracefully
      expect(result).toContain('<p')
    })

    it('preserves other CSS properties', () => {
      const html = '<p style="color: red; margin-top: 4px; margin-bottom: 4px; margin-left: 2px; margin-right: 2px; font-size: 14px;">Text</p>'
      const result = run(html, true)
      expect(result).toContain('color:')
      expect(result).toContain('font-size:')
      expect(result).toContain('margin:')
      expect(result).not.toContain('margin-top:')
    })

    it('does not modify when not all sides are specified', () => {
      const html = '<p style="margin-top: 4px; margin-bottom: 4px;">Text</p>'
      const result = run(html, true)
      // postcss-merge-longhand only works when all sides are specified
      expect(result).toBe('<p style="margin-top: 4px; margin-bottom: 4px;">Text</p>')
    })

    it('processes nested elements', () => {
      const html = '<div style="padding-top: 10px; padding-right: 10px; padding-bottom: 10px; padding-left: 10px;"><p style="margin-top: 5px; margin-bottom: 5px; margin-left: 5px; margin-right: 5px;">Text</p></div>'
      const result = run(html, true)
      expect(result).toContain('padding:')
      expect(result).toContain('margin:')
    })
  })
})

import { describe, it, expect } from 'vitest'
import { removeAttributes } from '../../transformers/removeAttributes.ts'
import { parse, serialize } from '../../utils/ast/index.ts'
import type { AttributesConfig } from '../../types/config.ts'

function run(html: string, remove?: Array<string | { name: string; value?: string | RegExp }>): string {
  return serialize(removeAttributes(parse(html), { remove } satisfies AttributesConfig))
}

describe('removeAttributes', () => {
  describe('default behavior', () => {
    it('removes empty style attributes by default', () => {
      const html = '<div style="">Content</div>'
      const result = run(html)
      expect(result).toBe('<div>Content</div>')
    })

    it('removes empty class attributes by default', () => {
      const html = '<div class="">Content</div>'
      const result = run(html)
      expect(result).toBe('<div>Content</div>')
    })

    it('keeps non-empty style attributes', () => {
      const html = '<div style="color: red;">Content</div>'
      const result = run(html)
      expect(result).toBe('<div style="color: red;">Content</div>')
    })

    it('keeps non-empty class attributes', () => {
      const html = '<div class="test">Content</div>'
      const result = run(html)
      expect(result).toBe('<div class="test">Content</div>')
    })
  })

  describe('remove by attribute name (empty values)', () => {
    it('removes empty data-src attributes', () => {
      const html = '<img src="test.jpg" data-src="" alt="Test">'
      const result = run(html, ['data-src'])
      expect(result).toBe('<img src="test.jpg" alt="Test">')
    })

    it('removes attributes without values', () => {
      const html = '<img src="test.jpg" data-src alt="Test">'
      const result = run(html, ['data-src'])
      expect(result).toBe('<img src="test.jpg" alt="Test">')
    })

    it('keeps non-empty data-src attributes', () => {
      const html = '<img src="test.jpg" data-src="original.jpg" alt="Test">'
      const result = run(html, ['data-src'])
      expect(result).toBe('<img src="test.jpg" data-src="original.jpg" alt="Test">')
    })

    it('handles multiple attribute names', () => {
      const html = '<div data-a="" data-b="" data-c="keep">Content</div>'
      const result = run(html, ['data-a', 'data-b'])
      expect(result).toBe('<div data-c="keep">Content</div>')
    })
  })

  describe('remove by name and exact value', () => {
    it('removes id attribute with specific value', () => {
      const html = '<div id="test">Content</div>'
      const result = run(html, [{ name: 'id', value: 'test' }])
      expect(result).toBe('<div>Content</div>')
    })

    it('keeps id attribute with different value', () => {
      const html = '<div id="other">Content</div>'
      const result = run(html, [{ name: 'id', value: 'test' }])
      expect(result).toBe('<div id="other">Content</div>')
    })

    it('handles multiple elements with same attribute', () => {
      const html = '<div id="test">A</div><div id="test">B</div><div id="other">C</div>'
      const result = run(html, [{ name: 'id', value: 'test' }])
      expect(result).toBe('<div>A</div><div>B</div><div id="other">C</div>')
    })
  })

  describe('remove by name and regex value', () => {
    it('removes data-id when value contains digits', () => {
      const html = '<div data-id="test"></div><div data-id="99"></div>'
      const result = run(html, [{ name: 'data-id', value: /\d/ }])
      expect(result).toBe('<div data-id="test"></div><div></div>')
    })

    it('removes class when value matches pattern', () => {
      const html = '<div class="temp-123"></div><div class="keep"></div>'
      const result = run(html, [{ name: 'class', value: /^temp-/ }])
      expect(result).toBe('<div></div><div class="keep"></div>')
    })

    it('handles complex regex patterns', () => {
      const html = '<div data-val="abc-123"></div><div data-val="xyz-456"></div><div data-val="no-match"></div>'
      const result = run(html, [{ name: 'data-val', value: /^[a-z]+-\d+$/ }])
      expect(result).toBe('<div></div><div></div><div data-val="no-match"></div>')
    })
  })

  describe('combined options', () => {
    it('handles strings and objects together', () => {
      const html = '<div data-empty="" id="remove" class="keep">Content</div>'
      const result = run(html, ['data-empty', { name: 'id', value: 'remove' }])
      expect(result).toBe('<div class="keep">Content</div>')
    })

    it('processes in order', () => {
      const html = '<div class="" style="" data-test="">Content</div>'
      const result = run(html, ['data-test'])
      // style and class are removed by default, data-test by user config
      expect(result).toBe('<div>Content</div>')
    })
  })

  describe('edge cases', () => {
    it('returns original HTML when no config', () => {
      const html = '<div data-test="value">Content</div>'
      // No attributes configured for removal, and no empty style/class
      expect(serialize(removeAttributes(parse(html), {}))).toBe(html)
    })

    it('handles HTML without attributes', () => {
      const html = '<div>Content</div>'
      const result = run(html, ['data-test'])
      expect(result).toBe('<div>Content</div>')
    })

    it('handles nested elements', () => {
      const html = '<div class=""><span data-empty="">Text</span></div>'
      const result = run(html, ['data-empty'])
      expect(result).toBe('<div><span>Text</span></div>')
    })

    it('handles empty remove array', () => {
      const html = '<div class="">Content</div>'
      const result = run(html, [])
      // Should still remove empty style and class by default
      expect(result).toBe('<div>Content</div>')
    })

    it('works with non-existent attributes', () => {
      const html = '<div>Content</div>'
      const result = run(html, ['data-missing'])
      expect(result).toBe('<div>Content</div>')
    })
  })
})

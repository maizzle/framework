import { describe, it, expect } from 'vitest'
import { replaceStrings } from '../../transformers/replaceStrings.ts'
import type { MaizzleConfig } from '../../types/config.ts'

function run(html: string, replacements?: Record<string, string>): string {
  const config: MaizzleConfig = replacements !== undefined ? { replaceStrings: replacements } : {}
  return replaceStrings(html, config)
}

describe('replaceStrings', () => {
  describe('core', () => {
    it('replaces an exact string', () => {
      expect(run('Hello World', { 'World': 'Maizzle' })).toBe('Hello Maizzle')
    })

    it('replaces all occurrences globally', () => {
      expect(run('foo foo foo', { 'foo': 'bar' })).toBe('bar bar bar')
    })

    it('replacement is case-insensitive', () => {
      expect(run('Hello HELLO hello', { 'hello': 'hi' })).toBe('hi hi hi')
    })

    it('applies multiple replacements in order', () => {
      const result = run('foo bar', { 'foo': 'baz', 'bar': 'qux' })
      expect(result).toBe('baz qux')
    })

    it('replaces using a regex pattern', () => {
      // \s?data-src="" — remove empty data-src attributes
      expect(run('<img data-src="" src="a.jpg">', { '\\s?data-src=""': '' })).toBe('<img src="a.jpg">')
    })

    it('supports regex character classes', () => {
      // \\d+ matches one or more digits
      expect(run('item-123 item-456', { '\\d+': 'X' })).toBe('item-X item-X')
    })

    it('replaces with empty string (deletion)', () => {
      expect(run('<div class="">Hello</div>', { '\\s?class=""': '' })).toBe('<div>Hello</div>')
    })

    it('replaces across the whole HTML string', () => {
      const html = '<p>Hello World</p><p>World again</p>'
      expect(run(html, { 'World': 'Maizzle' })).toBe('<p>Hello Maizzle</p><p>Maizzle again</p>')
    })
  })

  describe('config: disabled / empty', () => {
    it('returns input unchanged when replaceStrings is not set', () => {
      const html = '<p>Hello</p>'
      expect(run(html)).toBe(html)
    })

    it('returns input unchanged when replaceStrings is an empty object', () => {
      const html = '<p>Hello</p>'
      expect(run(html, {})).toBe(html)
    })
  })

  describe('short-circuit', () => {
    it('returns the exact same string reference when nothing to replace', () => {
      const html = '<div>Hello</div>'
      expect(run(html)).toBe(html)
    })

    it('handles empty input string', () => {
      expect(run('', { 'foo': 'bar' })).toBe('')
    })
  })

  describe('skip', () => {
    const skip = /<M\d>/g
    const run = (html: string, replacements: Record<string, string>) =>
      replaceStrings(html, { replaceStrings: replacements }, skip)

    it('leaves skipped spans untouched', () => {
      expect(run('a_<M1>b_<M2>', { '_|M|\\d': '-' })).toBe('a-<M1>b-<M2>')
    })

    it('keeps document-wide anchors', () => {
      expect(run('a<M1>b<M2>c', { '^': '[', '$': ']' })).toBe('[a<M1>b<M2>c]')
    })

    it('keeps lookaround context across skipped spans', () => {
      expect(run('a<M1>b', { '(?<=1>)b': 'B' })).toBe('a<M1>B')
    })

    it('expands replacement patterns', () => {
      expect(run('ab<M1>ab', { '(a)(?<second>b)': '$2$1$<second>[$&]$$' })).toBe('bab[ab]$<M1>bab[ab]$')
    })

    it('expands context patterns using the whole document', () => {
      expect(run('xay', { 'a': '($`|$\')' })).toBe('x(x|y)y')
    })

    it('skips matches that overlap a span', () => {
      expect(run('a<M1>b', { 'a<M': 'X' })).toBe('a<M1>b')
    })
  })
})

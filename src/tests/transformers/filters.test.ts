import { describe, it, expect } from 'vitest'
import { filters } from '../../transformers/filters/index.ts'
import { parse, serialize } from '../../utils/ast/index.ts'
import type { FiltersConfig } from '../../transformers/filters/index.ts'

function run(html: string, config?: FiltersConfig): string {
  return serialize(filters(parse(html), config))
}

describe('filters', () => {
  describe('disabled', () => {
    it('returns HTML unchanged when set to false', () => {
      const html = '<p uppercase>foo</p>'
      expect(run(html, false)).toBe(html)
    })

    it('applies defaults when config is undefined', () => {
      expect(run('<p uppercase>foo</p>')).toBe('<p>FOO</p>')
    })

    it('applies defaults when config is empty object', () => {
      expect(run('<p uppercase>foo</p>', {})).toBe('<p>FOO</p>')
    })
  })

  describe('removes filter attributes', () => {
    it('removes boolean filter attribute', () => {
      const result = run('<p uppercase>foo</p>')
      expect(result).not.toContain('uppercase')
      expect(result).toBe('<p>FOO</p>')
    })

    it('removes filter attribute with value', () => {
      const result = run('<p append=" bar">foo</p>')
      expect(result).not.toContain('append')
      expect(result).toBe('<p>foo bar</p>')
    })

    it('preserves non-filter attributes', () => {
      const result = run('<p class="text" uppercase>foo</p>')
      expect(result).toBe('<p class="text">FOO</p>')
    })
  })

  describe('multiple filters', () => {
    it('applies multiple filters in attribute order', () => {
      const result = run('<p prepend="foo " uppercase>bar</p>')
      expect(result).toBe('<p>FOO BAR</p>')
    })

    it('chains filters correctly', () => {
      const result = run('<p append=" world" uppercase>hello</p>')
      expect(result).toBe('<p>HELLO WORLD</p>')
    })

    it('applies trim then uppercase', () => {
      const result = run('<p trim uppercase>  foo  </p>')
      expect(result).toBe('<p>FOO</p>')
    })
  })

  describe('custom filters', () => {
    it('supports custom filter functions', () => {
      const result = run('<p reverse>hello</p>', {
        reverse: str => str.split('').reverse().join(''),
      })
      expect(result).toBe('<p>olleh</p>')
    })

    it('custom filters override defaults', () => {
      const result = run('<p uppercase>foo</p>', {
        uppercase: () => 'custom',
      })
      expect(result).toBe('<p>custom</p>')
    })

    it('custom filters merge with defaults', () => {
      const result = run('<p uppercase>foo</p><p reverse>bar</p>', {
        reverse: str => str.split('').reverse().join(''),
      })
      expect(result).toBe('<p>FOO</p><p>rab</p>')
    })

    it('custom filter receives attribute value', () => {
      const result = run('<p repeat="3">ab</p>', {
        repeat: (str, value) => str.repeat(Number.parseInt(value, 10)),
      })
      expect(result).toBe('<p>ababab</p>')
    })
  })

  describe('nested elements', () => {
    it('processes child filters before parent filters', () => {
      const result = run('<div uppercase><p append=" world">hello</p></div>')
      expect(result).toBe('<div><p>HELLO WORLD</p></div>')
    })

    it('handles sibling elements with different filters', () => {
      const result = run('<p uppercase>foo</p><p lowercase>BAR</p>')
      expect(result).toBe('<p>FOO</p><p>bar</p>')
    })

    it('preserves nested HTML structure', () => {
      const result = run('<div uppercase>hello <strong>world</strong></div>')
      expect(result).toBe('<div>HELLO <strong>WORLD</strong></div>')
    })
  })

  describe('elements without filters', () => {
    it('leaves elements without filter attributes unchanged', () => {
      const html = '<p>hello</p>'
      expect(run(html)).toBe(html)
    })

    it('leaves non-matching attributes unchanged', () => {
      const html = '<p class="foo" id="bar">hello</p>'
      expect(run(html)).toBe(html)
    })
  })

  describe('edge cases', () => {
    it('handles empty HTML', () => {
      expect(run('')).toBe('')
    })

    it('handles empty element content', () => {
      expect(run('<p uppercase></p>')).toBe('<p></p>')
    })

    it('handles self-closing elements', () => {
      expect(run('<br><p uppercase>test</p>')).toBe('<br><p>TEST</p>')
    })
  })

  describe('default filters', () => {
    describe('append', () => {
      it('appends text', () => {
        expect(run('<p append=" bar">foo</p>')).toBe('<p>foo bar</p>')
      })
    })

    describe('prepend', () => {
      it('prepends text', () => {
        expect(run('<p prepend="foo ">bar</p>')).toBe('<p>foo bar</p>')
      })
    })

    describe('uppercase', () => {
      it('uppercases the string', () => {
        expect(run('<p uppercase>foo</p>')).toBe('<p>FOO</p>')
      })
    })

    describe('lowercase', () => {
      it('lowercases the string', () => {
        expect(run('<p lowercase>FOO</p>')).toBe('<p>foo</p>')
      })
    })

    describe('capitalize', () => {
      it('capitalizes first letter', () => {
        expect(run('<p capitalize>foo</p>')).toBe('<p>Foo</p>')
      })
    })

    describe('ceil', () => {
      it('rounds up to nearest integer', () => {
        expect(run('<p ceil>1.2</p>')).toBe('<p>2</p>')
      })

      it('handles negative numbers', () => {
        expect(run('<p ceil>-1.8</p>')).toBe('<p>-1</p>')
      })
    })

    describe('floor', () => {
      it('rounds down to nearest integer', () => {
        expect(run('<p floor>1.8</p>')).toBe('<p>1</p>')
      })
    })

    describe('round', () => {
      it('rounds to nearest integer', () => {
        expect(run('<p round>1234.567</p>')).toBe('<p>1235</p>')
      })

      it('rounds down when below .5', () => {
        expect(run('<p round>1.4</p>')).toBe('<p>1</p>')
      })
    })

    describe('escape', () => {
      it('escapes HTML entities', () => {
        // Parser decodes &amp; to &, then escape re-encodes it
        expect(run('<p escape>foo &amp; bar</p>')).toBe('<p>foo &amp; bar</p>')
      })

      it('escapes quotes', () => {
        expect(run('<p escape>say "hello"</p>')).toBe('<p>say &#34;hello&#34;</p>')
      })
    })

    describe('escape-once', () => {
      it('does not double-escape entities', () => {
        expect(run('<p escape-once>foo &amp; bar</p>')).toBe('<p>foo &amp; bar</p>')
      })
    })

    describe('lstrip', () => {
      it('removes leading whitespace', () => {
        expect(run('<p lstrip>  test </p>')).toBe('<p>test </p>')
      })
    })

    describe('rstrip', () => {
      it('removes trailing whitespace', () => {
        expect(run('<p rstrip> test  </p>')).toBe('<p> test</p>')
      })
    })

    describe('trim', () => {
      it('removes leading and trailing whitespace', () => {
        expect(run('<p trim> test </p>')).toBe('<p>test</p>')
      })
    })

    describe('minus', () => {
      it('subtracts numbers', () => {
        expect(run('<p minus="2">3</p>')).toBe('<p>1</p>')
      })
    })

    describe('plus', () => {
      it('adds numbers', () => {
        expect(run('<p plus="2">3</p>')).toBe('<p>5</p>')
      })
    })

    describe('multiply', () => {
      it('multiplies numbers', () => {
        expect(run('<p multiply="2">1.2</p>')).toBe('<p>2.4</p>')
      })
    })

    describe('times', () => {
      it('is an alias for multiply', () => {
        expect(run('<p times="2">1.2</p>')).toBe('<p>2.4</p>')
      })
    })

    describe('divide-by', () => {
      it('divides numbers', () => {
        expect(run('<div divide-by="2">1.2</div>')).toBe('<div>0.6</div>')
      })
    })

    describe('divide', () => {
      it('is an alias for divide-by', () => {
        expect(run('<div divide="2">1.2</div>')).toBe('<div>0.6</div>')
      })
    })

    describe('modulo', () => {
      it('returns remainder', () => {
        expect(run('<p modulo="2">3</p>')).toBe('<p>1</p>')
      })
    })

    describe('newline-to-br', () => {
      it('replaces newlines with br tags', () => {
        expect(run('<p newline-to-br>\ntest\ntest\n</p>')).toBe('<p><br>test<br>test<br></p>')
      })
    })

    describe('strip-newlines', () => {
      it('removes newlines', () => {
        expect(run('<p strip-newlines>\n  test\n  test\n</p>')).toBe('<p>  test  test</p>')
      })
    })

    describe('remove', () => {
      it('removes all occurrences', () => {
        expect(run('<p remove="rain">I strained to see the train through the rain</p>'))
          .toBe('<p>I sted to see the t through the </p>')
      })
    })

    describe('remove-first', () => {
      it('removes first occurrence', () => {
        expect(run('<p remove-first="rain">I strained to see the train through the rain</p>'))
          .toBe('<p>I sted to see the train through the rain</p>')
      })

      it('returns unchanged if not found', () => {
        expect(run('<p remove-first="xyz">hello</p>')).toBe('<p>hello</p>')
      })
    })

    describe('replace', () => {
      it('replaces all occurrences', () => {
        expect(run('<p replace="t|1">test</p>')).toBe('<p>1es1</p>')
      })
    })

    describe('replace-first', () => {
      it('replaces first occurrence', () => {
        expect(run('<p replace-first="t|b">test</p>')).toBe('<p>best</p>')
      })

      it('returns unchanged if not found', () => {
        expect(run('<p replace-first="x|y">hello</p>')).toBe('<p>hello</p>')
      })
    })

    describe('size', () => {
      it('returns string length', () => {
        expect(run('<p size>one</p>')).toBe('<p>3</p>')
      })
    })

    describe('slice', () => {
      it('slices from index', () => {
        expect(run('<p slice="1">test</p>')).toBe('<p>est</p>')
      })

      it('slices with start and end', () => {
        expect(run('<p slice="0,-1">test</p>')).toBe('<p>tes</p>')
      })
    })

    describe('truncate', () => {
      it('truncates with default ellipsis', () => {
        expect(run('<p truncate="17">Ground control to Major Tom.</p>'))
          .toBe('<p>Ground control to...</p>')
      })

      it('truncates with custom ellipsis', () => {
        expect(run('<p truncate="17, no one">Ground control to Major Tom.</p>'))
          .toBe('<p>Ground control to no one</p>')
      })

      it('returns unchanged if shorter than limit', () => {
        expect(run('<p truncate="100">short</p>')).toBe('<p>short</p>')
      })
    })

    describe('truncate-words', () => {
      it('truncates by word count', () => {
        expect(run('<p truncate-words="2">Ground control to Major Tom.</p>'))
          .toBe('<p>Ground control...</p>')
      })

      it('truncates with custom ellipsis', () => {
        expect(run('<p truncate-words="2, over and out">Ground control to Major Tom.</p>'))
          .toBe('<p>Ground control over and out</p>')
      })

      it('returns unchanged if fewer words than limit', () => {
        expect(run('<p truncate-words="10">two words</p>')).toBe('<p>two words</p>')
      })
    })

    describe('url-decode', () => {
      it('decodes URL-encoded string', () => {
        expect(run('<p url-decode>%27Stop%21%27+said+Fred</p>'))
          .toBe("<p>'Stop!' said Fred</p>")
      })
    })

    describe('url-encode', () => {
      it('encodes string for URL', () => {
        expect(run('<p url-encode>user@example.com</p>'))
          .toBe('<p>user%40example.com</p>')
      })
    })
  })
})

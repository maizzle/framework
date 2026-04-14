import { describe, it, expect } from 'vitest'
import { Element } from 'domhandler'
import { addAttributes } from '../../transformers/addAttributes.ts'
import { parse, serialize } from '../../utils/ast/index.ts'
import type { AttributesConfig } from '../../types/config.ts'

function run(html: string, add?: false | Record<string, Record<string, string | boolean | number>>): string {
  return serialize(addAttributes(parse(html), { add } satisfies AttributesConfig))
}

describe('addAttributes', () => {
  describe('default behavior', () => {
    it('adds default attributes to table elements', () => {
      const result = run('<table><tr><td>Test</td></tr></table>')
      expect(result).toBe('<table cellpadding="0" cellspacing="0" role="none"><tr><td>Test</td></tr></table>')
    })

    it('adds default alt attribute to img elements', () => {
      const result = run('<img src="test.jpg">')
      expect(result).toBe('<img src="test.jpg" alt>')
    })

    it('applies defaults when config is undefined', () => {
      const result = serialize(addAttributes(parse('<table><tr><td></td></tr></table>'), {}))
      expect(result).toBe('<table cellpadding="0" cellspacing="0" role="none"><tr><td></td></tr></table>')
    })

    it('does not overwrite existing attributes', () => {
      const result = run('<table cellpadding="10"><tr><td></td></tr></table>')
      expect(result).toBe('<table cellpadding="10" cellspacing="0" role="none"><tr><td></td></tr></table>')
    })

    it('does not overwrite existing alt on img', () => {
      const result = run('<img src="test.jpg" alt="A photo">')
      expect(result).toBe('<img src="test.jpg" alt="A photo">')
    })

    it('handles multiple table and img elements', () => {
      const html = '<table><tr><td></td></tr></table><img src="a.jpg"><table><tr><td></td></tr></table>'
      const result = run(html)
      expect(result).toContain('cellpadding="0"')
      expect(result).toContain(' alt>')
      expect(result.match(/role="none"/g)).toHaveLength(2)
    })
  })

  describe('config: disabled', () => {
    it('returns HTML unchanged when set to false', () => {
      const html = '<table><tr><td>Test</td></tr></table>'
      const result = run(html, false)
      expect(result).toBe(html)
    })

    it('does not add img alt when disabled', () => {
      const html = '<img src="test.jpg">'
      const result = run(html, false)
      expect(result).toBe(html)
    })
  })

  describe('works with user config and defaults', () => {
    it('user attributes for same selector merge with defaults', () => {
      const result = run('<table><tr><td></td></tr></table>', {
        table: { border: 0 },
      })
      expect(result).toContain('cellpadding="0"')
      expect(result).toContain('cellspacing="0"')
      expect(result).toContain('role="none"')
      expect(result).toContain('border="0"')
    })

    it('user value wins over default for same attribute', () => {
      const result = run('<table><tr><td></td></tr></table>', {
        table: { role: 'presentation' },
      })
      expect(result).toContain('role="presentation"')
      expect(result).toContain('cellpadding="0"')
      expect(result).toContain('cellspacing="0"')
    })

    it('user can add new selectors while keeping defaults', () => {
      const result = run('<table><tr><td></td></tr></table><div>Test</div>', {
        div: { role: 'article' },
      })
      expect(result).toContain('cellpadding="0"')
      expect(result).toContain('role="article"')
    })

    it('user img attributes merge with default alt', () => {
      const result = run('<img src="test.jpg">', {
        img: { loading: 'lazy' },
      })
      expect(result).toContain(' alt')
      expect(result).toContain('loading="lazy"')
    })
  })

  describe('tag selectors', () => {
    it('matches by tag name', () => {
      const result = run('<div>Test</div>', {
        div: { role: 'article' },
      })
      expect(result).toBe('<div role="article">Test</div>')
    })

    it('matches multiple elements of same tag', () => {
      const result = run('<p>One</p><p>Two</p>', {
        p: { class: 'text' },
      })
      expect(result).toBe('<p class="text">One</p><p class="text">Two</p>')
    })
  })

  describe('class selectors', () => {
    it('matches elements by class name', () => {
      const result = run('<div class="test">Content</div><div>Other</div>', {
        '.test': { 'data-id': 'matched' },
      })
      expect(result).toContain('data-id="matched"')
      expect(result).toBe('<div class="test" data-id="matched">Content</div><div>Other</div>')
    })

    it('matches when element has multiple classes', () => {
      const result = run('<div class="foo bar">Content</div>', {
        '.bar': { 'data-matched': 'true' },
      })
      expect(result).toContain('data-matched="true"')
    })
  })

  describe('id selectors', () => {
    it('matches elements by id', () => {
      const result = run('<div id="header">Content</div><div>Other</div>', {
        '#header': { role: 'banner' },
      })
      expect(result).toBe('<div id="header" role="banner">Content</div><div>Other</div>')
    })

    it('does not match different id', () => {
      const html = '<div id="footer">Content</div>'
      const result = run(html, {
        '#header': { role: 'banner' },
      })
      expect(result).toBe(html)
    })
  })

  describe('attribute selectors', () => {
    it('matches by attribute existence [attr]', () => {
      const result = run('<div data-test>Content</div><div>Other</div>', {
        '[data-test]': { class: 'matched' },
      })
      expect(result).toContain('class="matched"')
    })

    it('matches by attribute value [attr=value]', () => {
      const result = run('<div role="alert">Warning</div><div role="status">Info</div>', {
        '[role=alert]': { class: 'alert-box' },
      })
      expect(result).toBe('<div role="alert" class="alert-box">Warning</div><div role="status">Info</div>')
    })

    it('matches tag with attribute selector', () => {
      const result = run('<div role="alert">Div</div><span role="alert">Span</span>', {
        'div[role=alert]': { class: 'danger' },
      })
      expect(result).toBe('<div role="alert" class="danger">Div</div><span role="alert">Span</span>')
    })

    it('matches tag with attribute existence', () => {
      const result = run('<input type="text" required><input type="text">', {
        'input[required]': { class: 'required-field' },
      })
      expect(result).toContain('class="required-field"')
      // Only the first input should have the class
      expect(result.match(/required-field/g)).toHaveLength(1)
    })
  })

  describe('comma-separated selectors', () => {
    it('matches multiple selectors', () => {
      const result = run('<div>One</div><p>Two</p><span>Three</span>', {
        'div, p': { class: 'content' },
      })
      expect(result).toBe('<div class="content">One</div><p class="content">Two</p><span>Three</span>')
    })

    it('handles whitespace around commas', () => {
      const result = run('<div>One</div><p>Two</p>', {
        'div ,  p': { 'data-type': 'text' },
      })
      expect(result).toContain('<div data-type="text">')
      expect(result).toContain('<p data-type="text">')
    })
  })

  describe('class attribute merging', () => {
    it('merges new classes with existing classes', () => {
      const result = run('<div class="existing">Content</div>', {
        div: { class: 'added' },
      })
      expect(result).toBe('<div class="existing added">Content</div>')
    })

    it('does not duplicate existing classes', () => {
      const result = run('<div class="foo bar">Content</div>', {
        div: { class: 'foo baz' },
      })
      expect(result).toBe('<div class="foo bar baz">Content</div>')
    })

    it('adds class when element has no class attribute', () => {
      const result = run('<div>Content</div>', {
        div: { class: 'new-class' },
      })
      expect(result).toBe('<div class="new-class">Content</div>')
    })

    it('handles multiple space-separated classes in config', () => {
      const result = run('<div class="a">Content</div>', {
        div: { class: 'b c d' },
      })
      expect(result).toBe('<div class="a b c d">Content</div>')
    })
  })

  describe('attribute value types', () => {
    it('handles boolean true values', () => {
      const result = run('<div>Content</div>', {
        div: { hidden: true },
      })
      expect(result).toBe('<div hidden="true">Content</div>')
    })

    it('handles number values', () => {
      const result = run('<td>Content</td>', {
        td: { colspan: 2 },
      })
      expect(result).toBe('<td colspan="2">Content</td>')
    })

    it('handles string values', () => {
      const result = run('<a>Link</a>', {
        a: { target: '_blank' },
      })
      expect(result).toBe('<a target="_blank">Link</a>')
    })
  })

  describe('nested elements', () => {
    it('processes nested matching elements', () => {
      const result = run('<table><tr><td><table><tr><td></td></tr></table></td></tr></table>')
      // Both tables should get default attributes
      expect(result.match(/cellpadding="0"/g)).toHaveLength(2)
    })

    it('handles deeply nested targets', () => {
      const result = run('<div><span><img src="deep.jpg"></span></div>')
      expect(result).toContain(' alt>')
    })
  })

  describe('short-circuit', () => {
    it('returns original string when no elements match', () => {
      const html = '<span>No tables or images here</span>'
      const result = run(html)
      expect(result).toBe(html)
    })

    it('returns original string when all attributes already exist', () => {
      const html = '<table cellpadding="5" cellspacing="5" role="grid"><tr><td></td></tr></table>'
      const result = run(html)
      expect(result).toBe(html)
    })

    it('returns original string when empty config and no defaults match', () => {
      const html = '<div>Content</div>'
      const result = serialize(addAttributes(parse(html), {}))
      expect(result).toBe(html)
    })
  })

  describe('edge cases', () => {
    it('handles empty HTML', () => {
      const result = run('')
      expect(result).toBe('')
    })

    it('handles HTML with no matching elements', () => {
      const html = '<div>Just text</div>'
      const result = run(html)
      expect(result).toBe(html)
    })

    it('handles self-closing elements', () => {
      const result = run('<br><hr>', {
        br: { class: 'break' },
      })
      expect(result).toContain('<br class="break"><hr>')
    })

    it('preserves existing attributes when adding new ones', () => {
      const result = run('<div id="main" data-existing="yes">Content</div>', {
        div: { class: 'added' },
      })
      expect(result).toContain('id="main"')
      expect(result).toContain('data-existing="yes"')
      expect(result).toContain('class="added"')
    })

    it('adds attributes to elements with no attribs object', () => {
      const el = new Element('div', {})
      // @ts-expect-error — simulating a node with undefined attribs
      delete el.attribs

      const dom = addAttributes([el], { add: { div: { role: 'article' } } })
      expect((dom[0] as Element).attribs.role).toBe('article')
    })
  })
})

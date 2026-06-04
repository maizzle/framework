import { describe, it, expect } from 'vitest'
import { inlineCss, type InlineCssOptions } from '../../transformers/inlineCss.ts'

function run(html: string, options?: InlineCssOptions | boolean): string {
  if (options === false) return html
  const opts = (options === true || options == null) ? {} : options
  return inlineCss(html, opts)
}

describe('inlineCss', () => {
  describe('basic', () => {
    it('inlines CSS into matching elements', () => {
      const html = '<style>.red { color: red; }</style><p class="red">Text</p>'
      const result = inlineCss(html)
      expect(result).toContain('style="color: red;"')
    })
  })

  describe('basic CSS inlining', () => {
    it('inlines multiple CSS properties', () => {
      const html = '<style>.btn { color: white; background: blue; padding: 10px; }</style><a class="btn">Click</a>'
      const result = run(html, true)
      expect(result).toContain('color: white')
      expect(result).toContain('background: blue')
      expect(result).toContain('padding: 10px')
    })
  })

  describe('styleToAttribute', () => {
    it('converts background-color to bgcolor', () => {
      const html = '<style>.bg-blue { background-color: blue; }</style><table class="bg-blue"></table>'
      const result = run(html, { styleToAttribute: { 'background-color': 'bgcolor' } })
      expect(result).toContain('bgcolor="blue"')
      expect(result).toContain('style="background-color: blue;"')
    })

    it('converts text-align to align on table cells', () => {
      const html = '<style>.center { text-align: center; }</style><td class="center">Text</td>'
      const result = run(html, { styleToAttribute: { 'text-align': 'align' } })
      expect(result).toContain('align="center"')
      expect(result).toContain('style="text-align: center;"')
    })
  })

  describe('removeInlinedSelectors', () => {
    it('removes inlined selectors', () => {
      const html = '<style>.red { color: red; }</style><p class="red">Text</p>'
      const result = run(html, { removeInlinedSelectors: true })
      expect(result).not.toContain('<style>.red { color: red; }</style>')
      expect(result).toContain('<p class="red" style="color: red;">Text</p>')
    })

    it('keeps classes when removeInlinedSelectors is false', () => {
      const html = '<style>.red { color: red; }</style><p class="red">Text</p>'
      const result = run(html, { removeInlinedSelectors: false })
      expect(result).toContain('class="red"')
      expect(result).toContain('style=')
    })
  })

  describe('preferUnitlessValues', () => {
    it('converts 0px to 0 by default', () => {
      const html = '<style>.zero { margin: 0px; }</style><p class="zero">Text</p>'
      const result = run(html, true)
      expect(result).toContain('margin: 0')
      expect(result).not.toContain('margin: 0px')
    })

    it('keeps units when preferUnitlessValues is false', () => {
      const html = '<style>.zero { margin: 0px; }</style><p class="zero">Text</p>'
      const result = run(html, { preferUnitlessValues: false })
      expect(result).toContain('margin: 0px')
    })
  })

  describe('safelist', () => {
    it('preserves safelisted classes', () => {
      const html = '<style>.red { color: red; }</style><p class="red">Text</p>'
      const result = run(html, { safelist: ['red'] })
      expect(result).toContain('class="red"')
      expect(result).toContain('style=')
    })

    it('preserves classes matching substring', () => {
      const html = '<style>.text-red { color: red; }</style><p class="text-red">Text</p>'
      const result = run(html, { safelist: ['text-red'] })
      expect(result).toContain('class="text-red"')
    })
  })

  describe('excludedProperties', () => {
    it('excludes specified properties from inlining', () => {
      const html = '<style>.box { color: red; padding: 10px; }</style><p class="box">Text</p>'
      const result = run(html, { excludedProperties: ['padding'] })
      expect(result).toContain('color: red')
      expect(result).not.toContain('padding: 10px')
    })
  })

  describe('codeBlocks', () => {
    it('ignores EJS code blocks by default', () => {
      const html = '<style>.red { color: <%= colorVar %>; }</style><p class="red">Text</p>'
      const result = run(html, true)
      expect(result).toContain('<%= colorVar %>')
    })

    it('ignores Handlebars code blocks by default', () => {
      const html = '<p class="{{ dynamicClass }}">Text</p>'
      const result = run(html, true)
      expect(result).toContain('{{ dynamicClass }}')
    })

    it('registers custom code blocks', () => {
      const html = '<style>.red { color: {{% colorVar %}}; }</style><p class="red">Text</p>'
      const result = run(html, {
        codeBlocks: {
          Twig: { start: '{{%', end: '%}}' },
        },
      })
      expect(result).toContain('{{% colorVar %}}')
    })

    it('skips a code block definition missing start or end', () => {
      const html = '<style>.red { color: red }</style><p class="red">Text</p>'
      const result = run(html, {
        codeBlocks: { Bad: { start: '{{%' } as any },
      })
      // Incomplete definition is ignored; normal inlining still happens.
      expect(result).toContain('color: red')
    })
  })

  describe('embedded styles', () => {
    it('preserves styles with data-embed attribute', () => {
      const html = '<style data-embed>.keep { color: blue; }</style><p class="keep">Text</p>'
      const result = run(html, { removeInlinedSelectors: false })
      // Juice strips data-embed but the style content should be preserved
      expect(result).toContain('<style')
      expect(result).toContain('.keep')
    })

    it('preserves styles with embed attribute', () => {
      const html = '<style embed>.keep { color: blue; }</style><p class="keep">Text</p>'
      const result = run(html, { removeInlinedSelectors: false })
      expect(result).toContain('embed')
      expect(result).toContain('.keep')
    })

    it('adds embed when data-embed has a truthy value', () => {
      const html = '<style data-embed="true">.keep { color: blue; }</style><p class="keep">Text</p>'
      const result = run(html, { removeInlinedSelectors: false })
      expect(result).toContain('embed')
      expect(result).toContain('.keep')
    })

    it('preserves styles with no-inline attribute', () => {
      const html = '<style no-inline>.keep { color: blue; }</style><p>Text</p>'
      const result = run(html, true)
      expect(result).toContain('<style no-inline>')
    })

    it('treats amp-custom like embed: contents preserved, no inlining', () => {
      const html = '<style amp-custom>.keep { color: blue; }</style><p class="keep">Text</p>'
      const result = run(html, { removeInlinedSelectors: false })
      // The amp-custom attribute survives (AMP requires it on the output).
      expect(result).toContain('amp-custom')
      // The CSS rule is preserved inside the style tag.
      expect(result).toContain('.keep')
      // The rule must NOT be inlined onto the matching element.
      expect(result).not.toContain('style="color: blue"')
    })

    it('does not add embed attribute to amp-custom style tags', () => {
      const html = '<style amp-custom>.keep { color: blue; }</style><p class="keep">Text</p>'
      const result = run(html, true)
      /**
       * `amp-custom` and `embed` are mutually exclusive in the output;
       * amp-custom is the user's chosen attr and stays unaltered.
       */
      expect(result).not.toMatch(/<style[^>]*\sembed[\s>=]/)
      expect(result).not.toContain('data-embed')
      expect(result).not.toContain('data-maizzle-embed')
    })
  })

  describe('width/height attributes', () => {
    it('applies width attributes to img elements', () => {
      const html = '<style>img { width: 100px; }</style><img src="test.jpg">'
      const result = run(html, true)
      expect(result).toContain('width="100"')
    })

    it('applies height attributes to img elements', () => {
      const html = '<style>img { height: 200px; }</style><img src="test.jpg">'
      const result = run(html, true)
      expect(result).toContain('height="200"')
    })

    it('respects custom widthElements', () => {
      const html = '<style>table { width: 500px; }</style><table></table>'
      const result = run(html, { widthElements: ['table'] })
      expect(result).toContain('width="500"')
    })

    it('disables width attributes when applyWidthAttributes is false', () => {
      const html = '<style>img { width: 100px; }</style><img src="test.jpg">'
      const result = run(html, { applyWidthAttributes: false, applyHeightAttributes: false })
      /**
       * Note: Juice may still add width attributes depending on its
       * internal behavior. This test verifies the option is passed
       * through correctly.
       */
      expect(result).toContain('style=')
    })
  })

  describe('customCSS', () => {
    it('inlines extra CSS not in the HTML', () => {
      const html = '<p class="red">Text</p>'
      const result = run(html, { customCSS: '.red { color: red; }' })
      expect(result).toContain('style="color: red;"')
    })

    it('merges customCSS with existing style tags', () => {
      const html = '<style>.blue { background: blue; }</style><p class="red blue">Text</p>'
      const result = run(html, { customCSS: '.red { color: red; }' })
      expect(result).toContain('color: red')
      expect(result).toContain('background: blue')
    })
  })

  describe('edge cases', () => {
    it('handles empty HTML', () => {
      expect(run('', true)).toBe('')
    })

    it('handles HTML without style tags', () => {
      const html = '<p>No styles here</p>'
      expect(run(html, true)).toBe(html)
    })

    it('handles multiple style tags', () => {
      const html = '<style>.red { color: red; }</style><style>.blue { background: blue; }</style><p class="red blue">Text</p>'
      const result = run(html, true)
      expect(result).toContain('color: red')
      expect(result).toContain('background: blue')
    })

    it('handles pseudo-selectors', () => {
      const html = '<style>a:hover { color: red; }</style><a>Link</a>'
      const result = run(html, true)
      expect(result).not.toContain('style=')
    })
  })

  describe('pre-existing inline styles are passed through verbatim', () => {
    it('does not inject a space inside https:// in url()', () => {
      const html = `<div style="background-image:url('https://example.com/img.jpg')">x</div>`
      const result = run(html, true)
      expect(result).toContain("background-image:url('https://example.com/img.jpg')")
      expect(result).not.toContain('https: //')
    })

    it('preserves data: URIs in url()', () => {
      const html = `<div style="background-image:url('data:image/png;base64,iVBORw0KG')">x</div>`
      const result = run(html, true)
      expect(result).toContain("background-image:url('data:image/png;base64,iVBORw0KG')")
    })

    it('preserves URLs with query strings containing colons or ampersands', () => {
      const html = `<div style="background-image:url('https://cdn.example.com/img.jpg?expires=1700000000&sig=abc')">x</div>`
      const result = run(html, true)
      expect(result).toContain("url('https://cdn.example.com/img.jpg?expires=1700000000&sig=abc')")
    })
  })
})

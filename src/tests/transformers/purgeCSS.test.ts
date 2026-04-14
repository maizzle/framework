import { describe, it, expect } from 'vitest'
import { purgeCSS } from '../../transformers/purgeCSS.ts'
import { parse, serialize } from '../../utils/ast/index.ts'
import type { CssConfig } from '../../types/config.ts'

function run(html: string, option?: CssConfig['purge']): string {
  const config: CssConfig = option === undefined ? {} : { purge: option }
  return serialize(purgeCSS(parse(html), config))
}

// ---------------------------------------------------------------------------
// Core feature — removes unused CSS
// ---------------------------------------------------------------------------

describe('purgeCSS', () => {
  it('removes unused CSS class from <style> and class attribute', () => {
    // Note: do not use '.unused' — it is in the default safelist (Notes 8 client)
    const html = `<html><head><style>.used { color: red } .discarded { color: blue }</style></head><body><p class="used">hi</p></body></html>`
    const result = run(html, true)
    expect(result).toContain('.used')
    expect(result).not.toContain('.discarded')
  })

  it('preserves used classes in both style tag and class attribute', () => {
    const html = `<html><head><style>.foo { color: red }</style></head><body><p class="foo">hi</p></body></html>`
    const result = run(html, true)
    expect(result).toContain('.foo')
    expect(result).toContain('class="foo"')
  })

  it('removes entire style rule when no matching element exists', () => {
    const html = `<html><head><style>.gone { margin: 0 }</style></head><body><p>hi</p></body></html>`
    const result = run(html, true)
    expect(result).not.toContain('.gone')
  })

  it('preserves all id selectors by default (due to #* in default safelist)', () => {
    // #* is in the default safelist for Freenet webmail compatibility,
    // so all id selectors are preserved even when unused.
    const html = `<html><head><style>#header { color: red } #used { color: blue }</style></head><body><div id="used">hi</div></body></html>`
    const result = run(html, true)
    expect(result).toContain('#used')
    expect(result).toContain('#header')
  })

  // ---------------------------------------------------------------------------
  // Default safelist — email client reset selectors are preserved
  // ---------------------------------------------------------------------------

  it('preserves *body* selector by default', () => {
    const html = `<html><head><style>body[yahoo] .foo { color: red } .unused { color: blue }</style></head><body><p>hi</p></body></html>`
    const result = run(html, true)
    // *body* pattern matches "body[yahoo]"
    expect(result).toContain('body[yahoo]')
  })

  it('preserves .gmail* selector by default', () => {
    const html = `<html><head><style>.gmail-fix { display: none }</style></head><body><p>hi</p></body></html>`
    const result = run(html, true)
    expect(result).toContain('.gmail-fix')
  })

  it('preserves .outlook* selector by default', () => {
    const html = `<html><head><style>.outlook-fix { mso-line-height-rule: exactly }</style></head><body><p>hi</p></body></html>`
    const result = run(html, true)
    expect(result).toContain('.outlook-fix')
  })

  it('preserves .moz-text-html selector by default', () => {
    const html = `<html><head><style>.moz-text-html .body { color: red }</style></head><body></body></html>`
    const result = run(html, true)
    expect(result).toContain('.moz-text-html')
  })

  // ---------------------------------------------------------------------------
  // HTML comments handling
  // ---------------------------------------------------------------------------

  it('removes HTML comments by default', () => {
    const html = `<html><head></head><body><!-- a comment --><p>hi</p></body></html>`
    const result = run(html, true)
    expect(result).not.toContain('<!-- a comment -->')
  })

  it('preserves Outlook conditional comments by default', () => {
    const html = `<html><head></head><body><!--[if mso]><p>mso</p><![endif]--><p>hi</p></body></html>`
    const result = run(html, true)
    expect(result).toContain('<!--[if mso]>')
    expect(result).toContain('<![endif]-->')
  })

  it('preserves HTML comments when removeHTMLComments is false', () => {
    const html = `<html><head></head><body><!-- keep me --><p>hi</p></body></html>`
    const result = run(html, { removeHTMLComments: false })
    expect(result).toContain('<!-- keep me -->')
  })

  // ---------------------------------------------------------------------------
  // CSS comments handling
  // ---------------------------------------------------------------------------

  it('removes CSS comments by default', () => {
    const html = `<html><head><style>/* this is a comment */ .foo { color: red }</style></head><body><p class="foo">hi</p></body></html>`
    const result = run(html, true)
    expect(result).not.toContain('/* this is a comment */')
  })

  it('preserves CSS comments when removeCSSComments is false', () => {
    const html = `<html><head><style>/* keep */ .foo { color: red }</style></head><body><p class="foo">hi</p></body></html>`
    const result = run(html, { removeCSSComments: false })
    expect(result).toContain('/* keep */')
  })

  // ---------------------------------------------------------------------------
  // safelist option — user additions append to defaults
  // ---------------------------------------------------------------------------

  it('preserves classes matching user safelist entries', () => {
    const html = `<html><head><style>.External { color: red } .ReadMsgBody { margin: 0 }</style></head><body></body></html>`
    const result = run(html, { safelist: ['.External*', '.ReadMsgBody'] })
    expect(result).toContain('.External')
    expect(result).toContain('.ReadMsgBody')
  })

  it('user safelist appends to default safelist (does not replace it)', () => {
    const html = `<html><head><style>.gmail-fix { color: red } .custom { color: blue }</style></head><body></body></html>`
    const result = run(html, { safelist: ['.custom'] })
    // Both the default safelist entry and the user one should survive
    expect(result).toContain('.gmail-fix')
    expect(result).toContain('.custom')
  })

  // ---------------------------------------------------------------------------
  // backend option — template tags inside class attributes are preserved
  // ---------------------------------------------------------------------------

  it('ignores default backend delimiters {{ }} so they are not treated as class names', () => {
    const html = `<html><head><style>.text-sm { font-size: 14px }</style></head><body><p class="{{ computed }} text-sm">hi</p></body></html>`
    // Should not throw and should preserve text-sm (it exists in the HTML)
    const result = run(html, true)
    expect(result).toContain('.text-sm')
  })

  it('accepts custom backend delimiters', () => {
    const html = `<html><head><style>.text-sm { font-size: 14px }</style></head><body><p class="[[ computed ]] text-sm">hi</p></body></html>`
    const result = run(html, { backend: [{ heads: '[[', tails: ']]' }] })
    expect(result).toContain('.text-sm')
  })

  // ---------------------------------------------------------------------------
  // uglify option
  // ---------------------------------------------------------------------------

  it('renames classes when uglify is true', () => {
    const html = `<html><head><style>.a-very-long-class-name { color: red }</style></head><body><p class="a-very-long-class-name">hi</p></body></html>`
    const result = run(html, { uglify: true })
    // The original long name should be gone, replaced by a short one
    expect(result).not.toContain('a-very-long-class-name')
  })

  // ---------------------------------------------------------------------------
  // Disabled / short-circuit
  // ---------------------------------------------------------------------------

  it('returns html unchanged when css.purge is false', () => {
    const html = `<html><head><style>.unused { color: red }</style></head><body><p>hi</p></body></html>`
    expect(run(html, false)).toBe(html)
  })

  it('returns html unchanged when css.purge is not set', () => {
    const html = `<html><head><style>.unused { color: red }</style></head><body><p>hi</p></body></html>`
    expect(run(html)).toBe(html)
  })

  it('returns html unchanged when config is not provided', () => {
    const html = `<html><head><style>.unused { color: red }</style></head><body><p>hi</p></body></html>`
    expect(serialize(purgeCSS(parse(html)))).toBe(html)
  })

  // ---------------------------------------------------------------------------
  // Deep purge — PostCSS + css-select DOM-aware selector removal
  // ---------------------------------------------------------------------------

  describe('deep purge', () => {
    it('removes compound selectors not matching any DOM element', () => {
      const html = `<html><head><style>.prose img { max-width: 100% } .prose p { margin: 0 }</style></head><body><div class="prose"><p>hi</p></div></body></html>`
      const result = run(html, true)
      expect(result).toContain('.prose p')
      expect(result).not.toContain('.prose img')
    })

    it('removes tag selectors not present in DOM', () => {
      const html = `<html><head><style>h1 { font-size: 24px } p { margin: 0 }</style></head><body><p>hi</p></body></html>`
      const result = run(html, true)
      expect(result).toContain('p')
      expect(result).not.toContain('h1')
    })

    it('preserves selectors that match elements in the DOM', () => {
      const html = `<html><head><style>.btn { padding: 10px } .btn-primary { color: blue }</style></head><body><a class="btn btn-primary">click</a></body></html>`
      const result = run(html, true)
      expect(result).toContain('.btn')
      expect(result).toContain('.btn-primary')
    })

    it('skips data-embed style tags', () => {
      // .prose img doesn't exist but deep purge should skip data-embed tags
      // The class .prose must exist so email-comb doesn't strip it first
      const html = `<html><head><style data-embed>.prose img { max-width: 100% }</style></head><body><div class="prose"><p>hi</p></div></body></html>`
      const result = run(html, true)
      expect(result).toContain('.prose img')
    })

    it('removes data-embed and embed attributes after purging', () => {
      const html = `<html><head><style data-embed embed>.prose { color: red }</style></head><body><div class="prose">hi</div></body></html>`
      const result = run(html, true)
      expect(result).not.toContain('data-embed')
      expect(result).not.toContain(' embed')
      expect(result).toContain('.prose')
    })

    it('removes :not() selectors when no element matches', () => {
      const html = `<html><head><style>.prose :not(pre) > code { color: red } .prose p { margin: 0 }</style></head><body><div class="prose"><p>hi</p></div></body></html>`
      const result = run(html, true)
      expect(result).toContain('.prose p')
      expect(result).not.toContain(':not(pre) > code')
    })

    it('preserves :not() selectors when elements match', () => {
      const html = `<html><head><style>.prose :not(pre) > code { color: red }</style></head><body><div class="prose"><p><code>hi</code></p></div></body></html>`
      const result = run(html, true)
      expect(result).toContain(':not(pre) > code')
    })

    it('preserves pseudo-class selectors', () => {
      const html = `<html><head><style>a:hover { color: red } .gone { color: blue }</style></head><body><a href="#">link</a></body></html>`
      const result = run(html, true)
      expect(result).toContain('a:hover')
      expect(result).not.toContain('.gone')
    })

    it('preserves pseudo-element selectors', () => {
      const html = `<html><head><style>p::before { content: "" }</style></head><body><p>hi</p></body></html>`
      const result = run(html, true)
      expect(result).toContain('p::before')
    })

    it('preserves rules inside @media at-rules', () => {
      // .btn exists in body so email-comb keeps the @media rule,
      // deep purge should skip rules inside at-rules
      const html = `<html><head><style>@media (max-width: 600px) { .btn { color: red } }</style></head><body><a class="btn">hi</a></body></html>`
      const result = run(html, true)
      expect(result).toContain('@media')
      expect(result).toContain('.btn')
    })

    it('removes empty at-rules after purging their children', () => {
      // .kept class exists so email-comb preserves the @media,
      // .gone does not exist so email-comb removes it at top level
      const html = `<html><head><style>.gone { color: red } @media (max-width: 600px) { .kept { display: block } }</style></head><body><div class="kept">hi</div></body></html>`
      const result = run(html, true)
      expect(result).not.toContain('.gone')
      expect(result).toContain('@media')
      expect(result).toContain('.kept')
    })

    it('removes style tag entirely when all rules are purged', () => {
      const html = `<html><head><style>.a { color: red } .b { color: blue }</style></head><body><p>hi</p></body></html>`
      const result = run(html, true)
      expect(result).not.toContain('<style')
      expect(result).not.toContain('</style>')
    })

    it('preserves default safelisted selectors in deep purge', () => {
      const html = `<html><head><style>.gmail-fix { display: none } .outlook-reset { margin: 0 } .gone { color: red }</style></head><body><p>hi</p></body></html>`
      const result = run(html, true)
      expect(result).toContain('.gmail-fix')
      expect(result).toContain('.outlook-reset')
      expect(result).not.toContain('.gone')
    })

    it('preserves user safelisted selectors in deep purge', () => {
      const html = `<html><head><style>.custom-keep { color: red } .nope { color: blue }</style></head><body><p>hi</p></body></html>`
      const result = run(html, { safelist: ['.custom-keep'] })
      expect(result).toContain('.custom-keep')
      expect(result).not.toContain('.nope')
    })

    it('trims unmatched selectors from a multi-selector rule', () => {
      const html = `<html><head><style>.exists, .ghost { color: red }</style></head><body><div class="exists">hi</div></body></html>`
      const result = run(html, true)
      expect(result).toContain('.exists')
      expect(result).not.toContain('.ghost')
    })

    it('does not throw on unusual selectors', () => {
      // Ensure deep purge handles edge cases gracefully without crashing
      const html = `<html><head><style>.foo > * + * { color: red }</style></head><body><div class="foo"><p>a</p><p>b</p></div></body></html>`
      const result = run(html, true)
      expect(result).toContain('.foo > * + *')
    })

    it('preserves selectors matching end-of-string safelist pattern', () => {
      const html = `<html><head><style>.thing-edo { color: red } .gone { color: blue }</style></head><body><p>hi</p></body></html>`
      const result = run(html, true)
      // *edo* safelist pattern matches substring, but test a suffix-only pattern
      const result2 = run(html, { safelist: ['*-edo'] })
      expect(result2).toContain('.thing-edo')
      expect(result2).not.toContain('.gone')
    })

    it('keeps rules with selectors that css-select cannot parse', () => {
      // Column combinator (||) is valid CSS but not supported by css-select
      const html = `<html><head><style>col.selected || td { color: red }</style></head><body><table><col class="selected"><tr><td>hi</td></tr></table></body></html>`
      const result = run(html, true)
      expect(result).toContain('col.selected || td')
    })

    it('removes empty @media after all its rules are purged', () => {
      // All rules inside @media reference non-existent elements,
      // deep purge skips at-rule children but email-comb removes the rules,
      // leaving an empty @media that should be cleaned up
      const html = `<html><head><style>p { color: red } @media (max-width: 600px) { }</style></head><body><p>hi</p></body></html>`
      const result = run(html, true)
      expect(result).not.toContain('@media')
      expect(result).toContain('p')
    })
  })
})

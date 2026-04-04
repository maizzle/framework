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
})

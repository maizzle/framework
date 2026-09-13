import { describe, it, expect } from 'vitest'
import { runTransformers } from '../../transformers/index.ts'
import type { MaizzleConfig } from '../../types/config.ts'

const html = '<html><head><style>.a{color:red}.unused{color:blue}</style></head>'
  + '<body><table width="100%"><tr><td class="a" style="margin-top:0px;margin-bottom:0px">x</td></tr></table></body></html>'

const run = (config: MaizzleConfig) => runTransformers(html, config)

describe('runTransformers config branches', () => {
  it('force-enables transformers via useTransformers toggles', async () => {
    const result = await run({
      useTransformers: {
        inlineCss: true,
        purgeCss: true,
        safeSelectors: true,
        shorthandCss: true,
        sixHex: true,
        prettify: true,
        minify: true,
        entities: true,
      },
    })
    expect(typeof result).toBe('string')
    expect(result).toContain('color')
  })

  it('accepts shorthand CSS as a boolean and as an object', async () => {
    expect(await run({ css: { inline: true, shorthand: true } })).toContain('<table')
    expect(await run({ css: { inline: true, shorthand: {} } })).toContain('<table')
  })

  it('accepts purge CSS as a boolean and as an object', async () => {
    expect(await run({ css: { purge: true } })).toContain('<table')
    expect(await run({ css: { purge: {} } })).toContain('<table')
  })

  it('accepts html.format as a boolean and as an object', async () => {
    expect(await run({ html: { format: true } })).toContain('<table')
    expect(await run({ html: { format: {} } })).toContain('<table')
  })

  it('accepts html.minify as a boolean and as an object', async () => {
    expect(await run({ html: { minify: true } })).toContain('<table')
    expect(await run({ html: { minify: {} } })).toContain('<table')
  })

  it('skips every transformer disabled via useTransformers', async () => {
    const result = await run({
      useTransformers: {
        safeSelectors: false,
        attributeToStyle: false,
        inlineCss: false,
        removeAttributes: false,
        shorthandCss: false,
        sixHex: false,
        addAttributes: false,
        filters: false,
        baseURL: false,
        urlQuery: false,
        purgeCss: false,
        entities: false,
        replaceStrings: false,
        prettify: false,
        minify: false,
      },
    })
    expect(typeof result).toBe('string')
    expect(result).toContain('<table')
  })

  it('removes configured attributes when remove is an array', async () => {
    const result = await runTransformers(
      '<html><head></head><body><div data-x="" data-keep="y">x</div></body></html>',
      { html: { attributes: { remove: ['data-x'] } } },
    )
    expect(result).not.toContain('data-x')
    expect(result).toContain('data-keep')
  })

  describe('<Outlook> placeholders', () => {
    const open = (cond = 'mso') => `<!--[if ${cond}]>__MAIZZLE_MSO_OPEN__<![endif]-->`
    const close = '<!--[if mso]>__MAIZZLE_MSO_CLOSE__<![endif]-->'

    it('inlines, purges and rewrites markup inside the conditional', async () => {
      const source = '<html><head><style>.a{color:red}.w{width:44px}.zzz{color:blue}@media screen{.mq{color:green}}</style></head><body>'
        + `<table class="w">${open()}<tr><td class="a mq">\u200D</td></tr>${close}</table>`
        + `${open()}<img src="/a.png" data-juice-duplicates="false" class="a">${close}`
        + '</body></html>'

      const result = await runTransformers(source, {
        css: { inline: true, purge: true },
        url: { base: 'https://example.com' },
      })

      expect(result).toContain('<!--[if mso]><tr><td class="mq" style="color: red;">&zwj;</td></tr><![endif]-->')
      expect(result).toContain('<!--[if mso]><img src="https://example.com/a.png" style="color: red;" alt><![endif]-->')
      expect(result).not.toContain('__MAIZZLE_MSO_')
      expect(result).toContain('.mq')
      expect(result).not.toContain('.zzz')
    })

    it('keeps unbalanced open/close fragments around the slot', async () => {
      const source = '<html><head></head><body>'
        + `${open('(gt mso 11)&(lt mso 16)')}<table><tr><td>${close}<p>x</p>${open()}</td></tr></table>${close}`
        + '</body></html>'

      const result = await runTransformers(source, {})

      expect(result).toContain('<!--[if (gt mso 11)&(lt mso 16)]><table cellpadding="0" cellspacing="0" role="none"><tr><td><![endif]-->')
      expect(result).toContain('<p>x</p><!--[if mso]></td></tr></table><![endif]-->')
    })

    it('resolves placeholders when the pipeline is disabled', async () => {
      const source = `<p>${open('mso 12')}<span class="a">x</span>${close}</p>`

      expect(await runTransformers(source, { useTransformers: false }))
        .toBe('<p><!--[if mso 12]><span class="a">x</span><![endif]--></p>')
    })
  })

  it('preserves whitespace-only MSO conditionals through purge and minify', async () => {
    const spacer = '<html><head></head><body><!--[if mso]>\u00A0\u00A0<![endif]--><p>x</p></body></html>'
    const result = await runTransformers(spacer, { css: { purge: true }, html: { minify: true } })
    expect(result).toContain('<!--[if mso]>&nbsp;&nbsp;')
    expect(result).toContain('<![endif]-->')
  })
})

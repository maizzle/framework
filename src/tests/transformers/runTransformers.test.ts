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
})

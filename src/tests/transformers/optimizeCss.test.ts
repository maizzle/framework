import { describe, it, expect } from 'vitest'
import postcss from 'postcss'
import { tailwindCleanup } from '../../plugins/postcss/tailwindCleanup.ts'
import { mergeMediaQueries } from '../../plugins/postcss/mergeMediaQueries.ts'
import type { MaizzleConfig } from '../../types/config.ts'

async function run(css: string, config: MaizzleConfig = {}): Promise<string> {
  const plugins: postcss.Plugin[] = [...tailwindCleanup(config)]

  const mediaPlugin = mergeMediaQueries(config)
  if (mediaPlugin) plugins.push(mediaPlugin)

  const result = await postcss(plugins).process(css, { from: undefined })

  return result.css
}

describe('optimizeCss', () => {
  describe(':host — default', () => {
    it('removes a standalone :host rule', async () => {
      expect(await run(':host { color: red }')).not.toContain(':host')
    })

    it('strips :host from :root, :host compound selector', async () => {
      const result = await run(':root, :host { --color: red }')
      expect(result).not.toContain(':host')
      expect(result).toContain(':root')
    })

    it('strips :host from html, :host compound selector', async () => {
      const result = await run('html, :host { box-sizing: border-box }')
      expect(result).not.toContain(':host')
      expect(result).toContain('html')
    })
  })

  describe(':lang — default', () => {
    it('removes a standalone :lang() rule', async () => {
      expect(await run(':lang(x) { quotes: auto }')).not.toContain(':lang')
    })

    it('strips :lang() from a compound selector, preserving other parts', async () => {
      const result = await run('*, :lang(x) { box-sizing: border-box }')
      expect(result).not.toContain(':lang')
      expect(result).toContain('*')
    })

    it('removes all :lang() parts when that is all there is (multi-value list)', async () => {
      const css = `:lang(ar),
:lang(fa),
:lang(he) {
  direction: rtl;
}`
      expect(await run(css)).not.toContain(':lang')
    })

    it('handles the lightningcss-flattened Tailwind RTL block', async () => {
      const css = `:lang(ar),
:lang(arc),
:lang(bcc),
:lang(bqi),
:lang(ckb),
:lang(dv),
:lang(fa),
:lang(glk),
:lang(he),
:lang(ku),
:lang(mzn),
:lang(nqo),
:lang(pnb),
:lang(ps),
:lang(sd),
:lang(ug),
:lang(ur),
:lang(yi) {
  left: 4px;
}
.keep { color: green }`
      const result = await run(css)
      expect(result).not.toContain(':lang')
      expect(result).toContain('.keep')
    })
  })

  describe(':lang inside @media — default', () => {
    it('removes :lang() rules nested inside @media blocks', async () => {
      const css = `@media screen {
  :lang(ar) { direction: rtl }
  .keep { color: red }
}`
      const result = await run(css)
      expect(result).not.toContain(':lang')
      expect(result).toContain('.keep')
    })
  })

  describe('@layer and @property — default', () => {
    it('removes @layer blocks', async () => {
      const result = await run('@layer base { .foo { color: red } } .keep { color: green }')
      expect(result).not.toContain('@layer')
      expect(result).toContain('.keep')
    })

    it('removes @property blocks', async () => {
      const result = await run('@property --my-color { syntax: "<color>"; inherits: false; initial-value: red; } .keep { color: green }')
      expect(result).not.toContain('@property')
      expect(result).toContain('.keep')
    })
  })

  describe('config: custom removeSelectors', () => {
    it('uses a custom list instead of defaults', async () => {
      const result = await run(':host { color: red } .foo { color: blue }', { postcss: { removeSelectors: ['.foo'] } })
      expect(result).not.toContain('.foo')
      expect(result).toContain(':host')
    })

    it('empty list removes nothing', async () => {
      const result = await run(':host { color: red } :lang(x) { quotes: auto }', { postcss: { removeSelectors: [], removeAtRules: [] } })
      expect(result).toContain(':host')
      expect(result).toContain(':lang')
    })
  })

  describe('config: custom removeAtRules', () => {
    it('uses a custom list instead of defaults', async () => {
      const result = await run('@layer base { .foo { color: red } } @media screen { .bar { color: blue } }', { postcss: { removeAtRules: ['media'] } })
      expect(result).not.toContain('@media')
      expect(result).toContain('@layer')
    })

    it('empty list removes nothing', async () => {
      const result = await run('@layer base { .foo { color: red } }', { postcss: { removeAtRules: [] } })
      expect(result).toContain('@layer')
    })
  })

  describe('mergeMediaQueries — on by default', () => {
    it('merges duplicate media queries when css.media is not set (on by default)', async () => {
      const css = `@media (max-width: 600px) { .a { color: red } }
@media (max-width: 600px) { .b { color: blue } }`
      const result = await run(css)
      expect(result.match(/@media/g)?.length).toBe(1)
      expect(result).toContain('.a')
      expect(result).toContain('.b')
    })

    it('does not merge media queries when css.media is false', async () => {
      const css = `@media (max-width: 600px) { .a { color: red } }
@media (max-width: 600px) { .b { color: blue } }`
      const result = await run(css, { css: { media: false } })
      expect(result.match(/@media/g)?.length).toBe(2)
    })
  })

  describe('mergeMediaQueries — enabled', () => {
    it('merges duplicate media queries when css.media is true', async () => {
      const css = `@media (max-width: 600px) { .a { color: red } }
@media (max-width: 600px) { .b { color: blue } }`
      const result = await run(css, { css: { media: true } })
      expect(result.match(/@media/g)?.length).toBe(1)
      expect(result).toContain('.a')
      expect(result).toContain('.b')
    })

    it('sorts mobile-first by default', async () => {
      const css = `@media (max-width: 600px) { .sm { color: red } }
@media (min-width: 768px) { .md { color: blue } }`
      const result = await run(css, { css: { media: true } })
      expect(result.indexOf('min-width')).toBeLessThan(result.indexOf('max-width'))
    })

    it('sorts desktop-first when configured', async () => {
      const css = `@media (min-width: 768px) { .md { color: blue } }
@media (max-width: 600px) { .sm { color: red } }`
      const result = await run(css, { css: { media: { sort: 'desktop-first' } } })
      expect(result.indexOf('max-width')).toBeLessThan(result.indexOf('min-width'))
    })
  })
})

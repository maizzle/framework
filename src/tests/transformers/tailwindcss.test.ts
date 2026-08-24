import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { tailwindcss, rewriteImportsSourceNone } from '../../transformers/tailwindcss.ts'
import { parse, serialize } from '../../utils/ast/index.ts'
import type { MaizzleConfig } from '../../types/config.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function run(html: string, filePath = path.resolve(__dirname, 'test.html'), config: MaizzleConfig = {}): Promise<string> {
  return tailwindcss(parse(html), config, filePath).then(serialize)
}

describe('tailwindcss', () => {
  describe('Tailwind CSS compilation', () => {
    it('compiles Tailwind utilities from @source inline', async () => {
      const html = '<style>@import "tailwindcss" source(none); @source inline("text-red-500 font-bold mt-4 hidden");</style><div class="text-red-500 font-bold mt-4 hidden">Test</div>'
      const result = await run(html, undefined, { postcss: { removeAtRules: [] } })

      expect(result).toContain('color:')
      expect(result).toContain('font-weight: 700')
      expect(result).toContain('margin-top:')
      expect(result).toContain('display: none')
      // Tailwind directives should be compiled away
      expect(result).not.toContain('@import "tailwindcss"')
      expect(result).not.toContain('@source inline')
    })

    it('compiles @theme block with custom tokens', async () => {
      const html = '<style>@import "tailwindcss" source(none); @source inline("text-primary"); @theme { --color-primary: #ff6600; }</style><div class="text-primary">Test</div>'
      const result = await run(html, undefined, { postcss: { removeAtRules: [] } })

      // Tailwind resolves the theme token directly into the utility
      expect(result).toContain('.text-primary')
      expect(result).toContain('color:')
      expect(result).not.toContain('@import "tailwindcss"')
      expect(result).not.toContain('@theme')
    })
  })

  describe('css.exclude', () => {
    it('compiles normally when exclude paths are configured', async () => {
      const html = '<style>@import "tailwindcss" source(none);</style><div class="text-red-500">Test</div>'
      const result = await run(html, undefined, {
        postcss: { removeAtRules: [] },
        css: { exclude: ['emails/ignored', 'public/legacy'] },
      })

      expect(result).toContain('color:')
      expect(result).not.toContain('@source')
    })

    it('emits no inline @source when the DOM has no class attributes', async () => {
      const html = '<style>@import "tailwindcss" source(none);</style><div>no classes</div>'
      const result = await run(html, undefined, { postcss: { removeAtRules: [] } })

      expect(result).not.toContain('@source inline')
      expect(result).not.toContain('@import "tailwindcss"')
    })
  })

  describe('lightningcss syntax lowering', () => {
    it('flattens CSS nesting to separate rules', async () => {
      const html = '<style>.parent { color: red; .child { color: blue } }</style>'
      const result = await run(html)

      expect(result).toContain('.parent {')
      expect(result).toContain('.parent .child {')
      // No nested selectors should remain
      expect(result).not.toContain('& .child')
      expect(result).not.toMatch(/\.parent\s*\{[^}]*\.child/)
    })

    it('lowers oklch() to a hex fallback', async () => {
      const html = '<style>.foo { color: oklch(0.7 0.15 180) }</style>'
      const result = await run(html)

      // lightningcss produces a hex fallback for oklch
      expect(result).toContain('color: #00b8a1')
      // original oklch() should be lowered
      expect(result).not.toContain('oklch(')
    })

    it('resolves color-mix() to computed value', async () => {
      const html = '<style>.foo { color: color-mix(in srgb, red 50%, blue) }</style>'
      const result = await run(html)

      expect(result).toContain('color: purple')
      expect(result).not.toContain('color-mix(')
    })

    it('expands logical properties to physical properties', async () => {
      const html = '<style>.foo { margin-inline: 10px; padding-block: 5px }</style>'
      const result = await run(html)

      expect(result).toContain('margin-left: 10px')
      expect(result).toContain('margin-right: 10px')
      expect(result).toContain('padding-top: 5px')
      expect(result).toContain('padding-bottom: 5px')
      expect(result).not.toContain('margin-inline')
      expect(result).not.toContain('padding-block')
    })
  })

  describe('pruneVars', () => {
    it('removes an unused custom property', async () => {
      const html = '<style>:root { --unused: red } .foo { color: blue }</style>'
      const result = await run(html)

      expect(result).not.toContain('--unused')
      expect(result).toContain('.foo')
      expect(result).toContain('color: #00f')
    })

    it('keeps a custom property that is referenced via var()', async () => {
      const html = '<style>:root { --brand: #ff0000 } .foo { color: var(--brand) }</style>'
      const result = await run(html)

      /**
       * resolveProps resolves the var() inline, so the
       * declaration is consumed and pruneVars should not blow up.
       */
      expect(result).toContain('.foo')
      expect(result).toContain('color: red')
    })

    it('removes multiple unused custom properties', async () => {
      const html = '<style>:root { --a: 1px; --b: 2px; --c: 3px } .foo { margin: var(--a) }</style>'
      const result = await run(html)

      expect(result).not.toContain('--b')
      expect(result).not.toContain('--c')
    })

    it('removes a custom property whose only reference is another unused var', async () => {
      // --mid is only used by --top; --top is never consumed → both pruned
      const html = '<style>:root { --mid: 2px; --top: var(--mid) } .foo { color: red }</style>'
      const result = await run(html)

      expect(result).not.toContain('--mid')
      expect(result).not.toContain('--top')
      expect(result).toContain('color: red')
    })

    it('keeps a chain of custom properties that are ultimately consumed', async () => {
      const html = '<style>:root { --base: #0000ff; --alias: var(--base) } .foo { color: var(--alias) }</style>'
      const result = await run(html)

      /**
       * resolveProps resolves the whole chain, so the final rule should
       * carry the concrete colour value (lightningcss normalises blue → #00f).
       */
      expect(result).toContain('.foo')
      expect(result).toContain('color: #00f')
    })

    it('does not touch regular properties', async () => {
      const html = '<style>.foo { color: red; font-size: 16px }</style>'
      const result = await run(html)

      expect(result).toContain('color: red')
      expect(result).toContain('font-size: 16px')
    })
  })

  describe('resolveProps', () => {
    it('resolves var() references to computed values', async () => {
      const html = '<style>:root { --my-color: #ff0000 } .foo { color: var(--my-color) }</style>'
      const result = await run(html)

      expect(result).toContain('.foo')
      expect(result).toContain('color: red')
      // var() should be resolved
      expect(result).not.toContain('var(--my-color)')
    })
  })

  describe('HTML entity decoding', () => {
    it('decodes &quot; to double quotes in CSS selectors', async () => {
      const html = '<style>.foo[data=&quot;bar&quot;] { background-image: url(&quot;test.jpg&quot;) }</style>'
      const result = await run(html)

      expect(result).toContain('[data="bar"]')
      expect(result).toContain('url("test.jpg")')
      expect(result).not.toContain('&quot;')
    })

    it('decodes in CSS comments', async () => {
      const html = '<style>/* a &amp; b */ .foo { color: red }</style>'
      const result = await run(html)

      expect(result).not.toContain('&amp;')
    })
  })

  describe('skip marked style tags', () => {
    it('skips style tags marked to be skipped', async () => {
      const html = '<style raw>.foo { color: red }</style>'
      const result = await run(html)
      expect(result).toBe('<style>.foo { color: red }</style>')
    })

    it('processes unmarked style tags but skips marked ones', async () => {
      const html = '<style>.process { margin-inline: 10px }</style><style raw>.keep { margin-inline: 10px }</style>'
      const result = await run(html)

      // The first style tag should be processed (logical properties lowered)
      expect(result).toContain('margin-left: 10px')
      expect(result).toContain('margin-right: 10px')
      // The raw style tag should be untouched
      expect(result).toContain('<style>.keep { margin-inline: 10px }</style>')
    })
  })

  describe('error handling', () => {
    it('falls back to decoded content when CSS processing fails', async () => {
      // @import that cannot resolve falls back to decoded content
      const html = '<style>@import &quot;./nonexistent.css&quot;;</style>'
      const result = await run(html)

      // Entity should be decoded even on error
      expect(result).toContain('@import "./nonexistent.css"')
      expect(result).not.toContain('&quot;')
    })
  })

  describe('short-circuit', () => {
    it('returns original HTML when there are no style tags', async () => {
      const html = '<div class="text-red-500">Hello</div>'
      const result = await run(html)
      expect(result).toBe(html)
    })

    it('returns original HTML for empty input', async () => {
      const result = await run('')
      expect(result).toBe('')
    })

    it('returns original HTML when style tag is empty', async () => {
      const html = '<style></style><div>Hello</div>'
      const result = await run(html)
      expect(result).toBe(html)
    })

    it('returns original HTML when style tag has only whitespace', async () => {
      const html = '<style>   </style>'
      const result = await run(html)
      expect(result).toBe(html)
    })
  })

  describe('multiple style tags', () => {
    it('processes each style tag independently', async () => {
      const html = '<style>.a { margin-inline: 5px }</style><div>mid</div><style>.b { padding-block: 8px }</style>'
      const result = await run(html)

      // First style tag
      expect(result).toContain('margin-left: 5px')
      expect(result).toContain('margin-right: 5px')
      // HTML between style tags preserved
      expect(result).toContain('<div>mid</div>')
      // Second style tag
      expect(result).toContain('padding-top: 8px')
      expect(result).toContain('padding-bottom: 8px')
    })
  })

  describe('edge cases', () => {
    it('preserves HTML outside style tags', async () => {
      const html = '<div class="test">Hello</div><style>.foo { color: red }</style><p>World</p>'
      const result = await run(html)

      expect(result).toContain('<div class="test">Hello</div>')
      expect(result).toContain('<p>World</p>')
    })

    it('handles style tag with type attribute', async () => {
      const html = '<style type="text/css">.foo { margin-inline: 10px }</style>'
      const result = await run(html)

      expect(result).toContain('margin-left: 10px')
    })

    it('handles media queries', async () => {
      const html = '<style>@media (max-width: 600px) { .foo { color: red } }</style>'
      const result = await run(html)

      expect(result).toContain('@media')
      expect(result).toContain('color: red')
    })

    it('passes filePath to postcss for source mapping', async () => {
      const html = '<style>.foo { color: red }</style>'
      const result = await run(html, '/path/to/template.vue')

      expect(result).toContain('.foo')
      expect(result).toContain('color: red')
    })
  })

  describe('rewriteImportsSourceNone', () => {
    it('appends source(none) to a tailwindcss import', () => {
      expect(rewriteImportsSourceNone('@import "tailwindcss";'))
        .toBe('@import "tailwindcss" source(none);')
    })

    it('appends source(none) to a @maizzle/tailwindcss import', () => {
      expect(rewriteImportsSourceNone('@import "@maizzle/tailwindcss";'))
        .toBe('@import "@maizzle/tailwindcss" source(none);')
    })

    it('handles subpath imports', () => {
      expect(rewriteImportsSourceNone('@import "tailwindcss/utilities";'))
        .toBe('@import "tailwindcss/utilities" source(none);')
    })

    it('preserves existing modifiers', () => {
      expect(rewriteImportsSourceNone('@import "tailwindcss/utilities" important;'))
        .toBe('@import "tailwindcss/utilities" important source(none);')
    })

    it('skips imports that already have a source() modifier', () => {
      expect(rewriteImportsSourceNone('@import "tailwindcss" source(none);'))
        .toBe('@import "tailwindcss" source(none);')
      expect(rewriteImportsSourceNone('@import "tailwindcss" source("../src");'))
        .toBe('@import "tailwindcss" source("../src");')
    })

    it('ignores non-Tailwind imports', () => {
      expect(rewriteImportsSourceNone('@import "./custom.css";'))
        .toBe('@import "./custom.css";')
    })
  })

  describe('css.scopedSources', () => {
    const fixture = path.resolve(__dirname, 'fixtures/scoped-source.html')

    it('scans files from the template import closure by default', async () => {
      // `tracking-widest` only exists in the fixture file, not in the DOM
      const html = '<style>@import "tailwindcss";</style><div class="underline">Test</div>'
      const result = await tailwindcss(parse(html), { postcss: { removeAtRules: [] } }, path.resolve(__dirname, 'test.html'), [fixture]).then(serialize)

      expect(result).toContain('.underline')
      expect(result).toContain('.tracking-widest')
      expect(result).toContain('letter-spacing:')
    })

    it('ignores sourceFiles when scopedSources is false', async () => {
      const html = '<style>@import "tailwindcss" source(none);</style><div class="underline">Test</div>'
      const result = await tailwindcss(parse(html), { postcss: { removeAtRules: [] }, css: { scopedSources: false } }, path.resolve(__dirname, 'test.html'), [fixture]).then(serialize)

      expect(result).toContain('.underline')
      expect(result).not.toContain('.tracking-widest')
    })

    it('falls back to non-scoped behavior when no sourceFiles are available', async () => {
      const html = '<style>@import "tailwindcss" source(none);</style><div class="underline">Test</div>'
      const result = await run(html, undefined, { postcss: { removeAtRules: [] } })

      expect(result).toContain('.underline')
      expect(result).not.toContain('.tracking-widest')
    })

    it('respects a user source() modifier in scoped mode', async () => {
      // Import already pins source(none) — the rewrite must not touch it,
      // and closure files are still added via @source directives.
      const html = '<style>@import "tailwindcss" source(none);</style><div class="underline">Test</div>'
      const result = await tailwindcss(parse(html), { postcss: { removeAtRules: [] } }, path.resolve(__dirname, 'test.html'), [fixture]).then(serialize)

      expect(result).toContain('.underline')
      expect(result).toContain('.tracking-widest')
    })
  })

  describe('gradients', () => {
    const tw = '@import "tailwindcss" source(none);'

    function gradient(classes: string): Promise<string> {
      const html = `<style>${tw} @source inline("${classes}");</style><div class="${classes}">x</div>`
      return run(html, undefined, { postcss: { removeAtRules: [] } })
    }

    it('flattens a linear gradient into a single email-safe declaration', async () => {
      const result = await gradient('bg-linear-to-bl from-indigo-50 to-indigo-600')

      expect(result).toContain('.bg-linear-gradient-to-bl-from-indigo-50-to-indigo-600')
      expect(result).toContain('background-image: linear-gradient(to bottom left, #eef2ff, #4f39f6)')
      // Rewrites the element to the single generated class
      expect(result).toContain('<div class="bg-linear-gradient-to-bl-from-indigo-50-to-indigo-600">')
      // No leftover Tailwind gradient machinery
      expect(result).not.toContain('--tw-gradient')
      expect(result).not.toContain('var(--tw-gradient-stops)')
      expect(result).not.toContain('.from-indigo-50')
    })

    it('resolves via stops and keeps declared colors', async () => {
      const result = await gradient('bg-linear-to-r from-red-500 via-yellow-400 to-green-600')

      expect(result).toContain('background-image: linear-gradient(to right, #fb2c36, #fac800, #00a544)')
    })

    it('defaults a missing stop to transparent', async () => {
      const result = await gradient('bg-linear-to-r from-indigo-500')

      expect(result).toContain('linear-gradient(to right, #625fff, rgba(0, 0, 0, 0))')
    })

    it('writes transparent stops (normalized like all colors)', async () => {
      const result = await gradient('bg-linear-to-r from-blue-500 to-transparent')

      // lightningcss lowers the `transparent` keyword to rgba, same as
      // everywhere else in Maizzle's output.
      expect(result).toContain('linear-gradient(to right, #3080ff, rgba(0, 0, 0, 0))')
    })

    it('supports angle directions', async () => {
      const result = await gradient('bg-linear-45 from-indigo-500 to-pink-500')

      expect(result).toContain('linear-gradient(45deg, #625fff, #f6339a)')
    })

    it('strips the interpolation method from radial gradients', async () => {
      const result = await gradient('bg-radial from-red-500 to-green-600')

      // No `in oklab` interpolation keyword leaks into the gradient
      expect(result).toContain('background-image: radial-gradient(#fb2c36, #00a544)')
    })

    it('supports conic gradients with an angle', async () => {
      const result = await gradient('bg-conic-180 from-blue-500 to-pink-500')

      expect(result).toContain('conic-gradient(from 180deg, #3080ff, #f6339a)')
    })

    it('keeps explicit non-default stop positions and omits defaults', async () => {
      const result = await gradient('bg-linear-to-r from-indigo-500 from-25% to-pink-500 to-90%')

      expect(result).toContain('linear-gradient(to right, #625fff 25%, #f6339a 90%)')
    })

    it('supports arbitrary color values', async () => {
      const result = await gradient('bg-linear-to-r from-[#ff0000] to-[#0000ff]')

      expect(result).toContain('linear-gradient(to right, red, #00f)')
      expect(result).toContain('.bg-linear-gradient-to-r-from-ff0000-to-0000ff')
    })

    it('reuses one rule for elements sharing a gradient', async () => {
      const html = `<style>${tw} @source inline("bg-linear-to-r from-red-500 to-blue-500");</style>`
        + '<div class="bg-linear-to-r from-red-500 to-blue-500">a</div>'
        + '<div class="bg-linear-to-r from-red-500 to-blue-500">b</div>'
      const result = await run(html, undefined, { postcss: { removeAtRules: [] } })

      const occurrences = result.split('.bg-linear-gradient-to-r-from-red-500-to-blue-500 {').length - 1
      expect(occurrences).toBe(1)
    })

    it('preserves non-gradient classes on the element', async () => {
      const result = await gradient('p-4 bg-linear-to-r from-red-500 to-blue-500 rounded')

      expect(result).toMatch(/<div class="p-4 rounded bg-linear-gradient-to-r-from-red-500-to-blue-500">/)
    })

    it('keeps the gradient in the source position of the original utility', async () => {
      // Later author CSS at equal specificity must still win, so the
      // generated rule takes the utility's place rather than moving to
      // the end of the stylesheet.
      const html = `<style>${tw} @source inline("bg-linear-to-r from-red-500 to-blue-500");`
        + ' .hero { background-image: url(fallback.png) }</style>'
        + '<div class="hero bg-linear-to-r from-red-500 to-blue-500">x</div>'
      const result = await run(html, undefined, { postcss: { removeAtRules: [] } })

      const gradientAt = result.indexOf('.bg-linear-gradient-to-r-from-red-500-to-blue-500 {')
      const authorAt = result.indexOf('.hero {')
      expect(gradientAt).toBeGreaterThan(-1)
      expect(gradientAt).toBeLessThan(authorAt)
    })
  })
})

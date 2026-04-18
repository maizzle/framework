import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { tailwindcss } from '../../transformers/tailwindcss.ts'
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

      // resolveProps resolves the var() inline, so the
      // declaration is consumed — pruneVars should not blow up
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

      // resolveProps resolves the whole chain, so the final
      // rule should carry the concrete colour value (lightningcss normalises blue → #00f)
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
})

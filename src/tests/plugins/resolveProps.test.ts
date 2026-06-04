import { describe, it, expect } from 'vitest'
import postcss from 'postcss'
import resolveProps from '../../plugins/postcss/resolveProps.ts'

async function run(css: string): Promise<string> {
  const result = await postcss([resolveProps()]).process(css, { from: undefined })
  return result.css
}

describe('resolveProps', () => {
  describe(':root vars', () => {
    it('resolves var() referencing :root', async () => {
      const result = await run(':root { --brand: #ff0000 } .foo { color: var(--brand) }')
      expect(result).toContain('color: #ff0000')
      expect(result).not.toContain('var(')
    })

    it('removes :root custom property declarations', async () => {
      const result = await run(':root { --brand: red } .foo { color: var(--brand) }')
      expect(result).not.toContain('--brand')
      expect(result).not.toContain(':root')
    })

    it('preserves non-custom-property :root declarations', async () => {
      const result = await run(':root { --brand: red; font-size: 16px } .foo { color: var(--brand) }')
      expect(result).toContain('font-size: 16px')
      expect(result).toContain(':root')
    })

    it('resolves chained :root vars', async () => {
      const result = await run(':root { --base: blue; --alias: var(--base) } .foo { color: var(--alias) }')
      expect(result).toContain('color: blue')
      expect(result).not.toContain('var(')
    })

    it('resolves multiple :root vars in one value', async () => {
      const result = await run(':root { --x: 10px; --y: 20px } .foo { margin: var(--x) var(--y) }')
      expect(result).toContain('margin: 10px 20px')
    })

    it('resolves :root vars inside @layer', async () => {
      const css = `
        @layer theme {
          :root {
            --font-weight-bold: 700;
            --color-red: red;
          }
        }
        @layer utilities {
          .font-bold { font-weight: var(--font-weight-bold) }
          .text-red { color: var(--color-red) }
        }
      `
      const result = await run(css)
      expect(result).toContain('font-weight: 700')
      expect(result).toContain('color: red')
      expect(result).not.toContain('var(')
      expect(result).not.toContain('--font-weight-bold')
      expect(result).not.toContain('--color-red')
    })

    it('skips :root inside @media', async () => {
      const css = `
        :root { --light: white }
        @media (prefers-color-scheme: dark) {
          :root { --dark: black }
        }
        .foo { color: var(--light) }
      `
      const result = await run(css)
      expect(result).toContain('color: white')
      // :root inside @media should be preserved
      expect(result).toContain('--dark: black')
    })
  })

  describe('local vars', () => {
    it('resolves var() referencing local declaration in same rule', async () => {
      const result = await run('.foo { --my-color: red; color: var(--my-color) }')
      expect(result).toContain('color: red')
      expect(result).not.toContain('--my-color')
      expect(result).not.toContain('var(')
    })

    it('resolves multiple local vars', async () => {
      const result = await run('.foo { --a: 10px; --b: 20px; margin: var(--a) var(--b) }')
      expect(result).toContain('margin: 10px 20px')
      expect(result).not.toContain('--a')
      expect(result).not.toContain('--b')
    })

    it('resolves local var referencing another local var', async () => {
      const result = await run('.foo { --base: red; --alias: var(--base); color: var(--alias) }')
      expect(result).toContain('color: red')
    })

    it('resolves local var referencing a :root var', async () => {
      const result = await run(':root { --global: blue } .foo { --local: var(--global); color: var(--local) }')
      expect(result).toContain('color: blue')
    })

    it('removes all local --* declarations after resolution', async () => {
      const result = await run('.foo { --a: red; --b: blue; color: var(--a); background: var(--b) }')
      expect(result).not.toContain('--a')
      expect(result).not.toContain('--b')
      expect(result).toContain('color: red')
      expect(result).toContain('background: blue')
    })
  })

  describe('Tailwind composable pattern', () => {
    it('resolves tabular-nums correctly', async () => {
      const css = `.tabular-nums {
        --tw-numeric-spacing: tabular-nums;
        font-variant-numeric: var(--tw-ordinal,) var(--tw-slashed-zero,) var(--tw-numeric-figure,) var(--tw-numeric-spacing,) var(--tw-numeric-fraction,);
      }`
      const result = await run(css)
      expect(result).toContain('font-variant-numeric:')
      expect(result).toContain('tabular-nums')
      expect(result).not.toContain('var(')
      expect(result).not.toContain('--tw-')
    })

    it('resolves multiple active composable vars', async () => {
      const css = `.foo {
        --tw-ordinal: ordinal;
        --tw-numeric-spacing: tabular-nums;
        font-variant-numeric: var(--tw-ordinal,) var(--tw-slashed-zero,) var(--tw-numeric-figure,) var(--tw-numeric-spacing,) var(--tw-numeric-fraction,);
      }`
      const result = await run(css)
      expect(result).toContain('ordinal')
      expect(result).toContain('tabular-nums')
      expect(result).not.toContain('var(')
    })

    it('removes declaration when all composable vars are empty', async () => {
      const css = `.foo {
        font-variant-numeric: var(--tw-ordinal,) var(--tw-slashed-zero,);
      }`
      const result = await run(css)
      // All empty fallbacks → empty value → declaration removed
      expect(result).not.toContain('font-variant-numeric')
    })

    it('resolves shadow composable pattern', async () => {
      const css = `.shadow-lg {
        --tw-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
        box-shadow: var(--tw-ring-offset-shadow,) var(--tw-ring-shadow,) var(--tw-shadow);
      }`
      const result = await run(css)
      expect(result).toContain('box-shadow:')
      expect(result).toContain('0 10px 15px')
      expect(result).not.toContain('var(')
    })
  })

  describe('fallbacks', () => {
    it('uses fallback when var is not defined', async () => {
      const result = await run('.foo { color: var(--missing, red) }')
      expect(result).toContain('color: red')
    })

    it('uses empty fallback', async () => {
      const result = await run('.foo { --a: value; custom: var(--a,) var(--missing,) }')
      expect(result).toContain('custom: value')
    })

    it('resolves nested var() in fallback', async () => {
      const css = ':root { --backup: green } .foo { color: var(--missing, var(--backup)) }'
      const result = await run(css)
      expect(result).toContain('color: green')
    })

    it('uses inner fallback when both vars missing', async () => {
      const result = await run('.foo { color: var(--a, var(--b, red)) }')
      expect(result).toContain('color: red')
    })

    it('leaves var() as-is when unresolvable with no fallback', async () => {
      const result = await run('.foo { color: var(--unknown) }')
      expect(result).toContain('var(--unknown)')
    })

    it('resolves a later var() after an unresolvable one with no fallback', async () => {
      const result = await run(':root { --brand: red } .foo { background: var(--unknown) var(--brand) }')
      expect(result).toContain('var(--unknown) red')
    })

    it('leaves a malformed var( with unbalanced parens untouched', async () => {
      const result = await run('.foo { content: "var(--x" }')
      expect(result).toContain('var(--x')
    })
  })

  describe('edge cases', () => {
    it('ignores @property whose name is not a custom property', async () => {
      const result = await run('@property foo { syntax: "*"; inherits: false } .keep { color: red }')
      expect(result).toContain('.keep')
    })

    it('leaves a :root var that references an unresolvable var unchanged', async () => {
      const result = await run(':root { --alias: var(--unknown) } .foo { color: var(--alias) }')
      expect(result).toContain('var(--unknown)')
    })

    it('skips non-declaration nodes when resolving a rule with var refs', async () => {
      const result = await run(':root { --brand: red } .foo { /* note */ color: var(--brand) }')
      expect(result).toContain('color: red')
    })
  })

  describe('user custom properties', () => {
    it('resolves user-defined local vars', async () => {
      const css = `.card {
        --card-bg: #fff;
        --card-radius: 8px;
        background: var(--card-bg);
        border-radius: var(--card-radius);
      }`
      const result = await run(css)
      expect(result).toContain('background: #fff')
      expect(result).toContain('border-radius: 8px')
      expect(result).not.toContain('--card-')
    })

    it('resolves mixed :root and local vars', async () => {
      const css = `
        :root { --brand: #007bff }
        .btn {
          --btn-padding: 12px 24px;
          color: var(--brand);
          padding: var(--btn-padding);
        }
      `
      const result = await run(css)
      expect(result).toContain('color: #007bff')
      expect(result).toContain('padding: 12px 24px')
    })
  })

  describe('edge cases', () => {
    it('handles empty input', async () => {
      expect(await run('')).toBe('')
    })

    it('handles CSS with no vars', async () => {
      const css = '.foo { color: red; margin: 10px }'
      const result = await run(css)
      expect(result).toContain('color: red')
      expect(result).toContain('margin: 10px')
    })

    it('handles rules with only --* declarations', async () => {
      const result = await run('.foo { --unused: red }')
      // Declaration removed, rule may be empty
      expect(result).not.toContain('--unused')
    })

    it('preserves non-var declarations in the same rule', async () => {
      const css = '.foo { --x: red; color: var(--x); font-size: 16px }'
      const result = await run(css)
      expect(result).toContain('color: red')
      expect(result).toContain('font-size: 16px')
    })

    it('handles multiple rules independently', async () => {
      const css = '.a { --x: red; color: var(--x) } .b { --x: blue; color: var(--x) }'
      const result = await run(css)
      expect(result).toContain('.a')
      expect(result).toContain('.b')
      // Each rule resolved independently
      expect(result).not.toContain('var(')
    })

    it('handles var() with whitespace in name', async () => {
      const result = await run('.foo { --x: red; color: var( --x ) }')
      expect(result).toContain('color: red')
    })

    it('handles var() inside media queries', async () => {
      const css = ':root { --c: red } @media (max-width: 600px) { .foo { color: var(--c) } }'
      const result = await run(css)
      expect(result).toContain('color: red')
    })
  })

  describe('performance', () => {
    it('handles many vars without hanging', async () => {
      const vars = Array.from({ length: 100 }, (_, i) => `--v${i}: ${i}px`).join('; ')
      const refs = Array.from({ length: 100 }, (_, i) => `prop${i}: var(--v${i})`).join('; ')
      const css = `.foo { ${vars}; ${refs} }`
      const result = await run(css)
      expect(result).toContain('prop0: 0px')
      expect(result).toContain('prop99: 99px')
      expect(result).not.toContain('var(')
    })
  })
})

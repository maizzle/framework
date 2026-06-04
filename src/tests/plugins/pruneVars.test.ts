import { describe, it, expect } from 'vitest'
import postcss from 'postcss'
import pruneVars from '../../plugins/postcss/pruneVars.ts'

async function run(css: string): Promise<string> {
  const result = await postcss([pruneVars()]).process(css, { from: undefined })
  return result.css
}

describe('pruneVars', () => {
  describe('unused variables', () => {
    it('removes a single unused custom property', async () => {
      const result = await run(':root { --unused: red } .foo { color: blue }')
      expect(result).not.toContain('--unused')
      expect(result).toContain('color: blue')
    })

    it('removes multiple unused custom properties', async () => {
      const result = await run(':root { --a: 1px; --b: 2px; --c: 3px } .foo { color: red }')
      expect(result).not.toContain('--a')
      expect(result).not.toContain('--b')
      expect(result).not.toContain('--c')
    })

    it('removes unused local custom property', async () => {
      const result = await run('.foo { --unused: red; color: blue }')
      expect(result).not.toContain('--unused')
      expect(result).toContain('color: blue')
    })
  })

  describe('used variables', () => {
    it('keeps a custom property referenced by var()', async () => {
      const result = await run(':root { --brand: red } .foo { color: var(--brand) }')
      expect(result).toContain('--brand: red')
      expect(result).toContain('var(--brand)')
    })

    it('keeps a local custom property referenced in the same rule', async () => {
      const result = await run('.foo { --x: 10px; margin: var(--x) }')
      expect(result).toContain('--x: 10px')
    })

    it('keeps a custom property referenced from a different rule', async () => {
      const result = await run('.a { --shared: blue } .b { color: var(--shared) }')
      expect(result).toContain('--shared: blue')
    })
  })

  describe('dependency chains', () => {
    it('keeps vars in a chain that is ultimately consumed', async () => {
      const result = await run(':root { --base: blue; --alias: var(--base) } .foo { color: var(--alias) }')
      expect(result).toContain('--base: blue')
      expect(result).toContain('--alias')
    })

    it('removes a chain of vars where the top is never consumed', async () => {
      const result = await run(':root { --mid: 2px; --top: var(--mid) } .foo { color: red }')
      expect(result).not.toContain('--mid')
      expect(result).not.toContain('--top')
    })

    it('removes deep unused chain', async () => {
      const result = await run(':root { --a: 1; --b: var(--a); --c: var(--b) } .foo { color: red }')
      expect(result).not.toContain('--a')
      expect(result).not.toContain('--b')
      expect(result).not.toContain('--c')
    })

    it('keeps deep chain when leaf is consumed', async () => {
      const result = await run(':root { --a: 1px; --b: var(--a); --c: var(--b) } .foo { margin: var(--c) }')
      expect(result).toContain('--a')
      expect(result).toContain('--b')
      expect(result).toContain('--c')
    })
  })

  describe('mixed used and unused', () => {
    it('removes only the unused vars', async () => {
      const result = await run(':root { --used: red; --unused: blue } .foo { color: var(--used) }')
      expect(result).toContain('--used: red')
      expect(result).not.toContain('--unused')
    })

    it('handles multiple declarations of the same var', async () => {
      const css = '.a { --x: red } .b { --x: blue } .c { color: var(--x) }'
      const result = await run(css)
      // Both declarations kept because --x is used
      expect(result).toContain('.a')
      expect(result).toContain('.b')
      expect(result).toContain('var(--x)')
    })
  })

  describe('regular properties', () => {
    it('does not touch non-custom properties', async () => {
      const result = await run('.foo { color: red; font-size: 16px; margin: 10px }')
      expect(result).toContain('color: red')
      expect(result).toContain('font-size: 16px')
      expect(result).toContain('margin: 10px')
    })
  })

  describe('at-rules', () => {
    it('removes unused vars inside @media', async () => {
      const css = '@media (max-width: 600px) { :root { --unused: red } } .foo { color: blue }'
      const result = await run(css)
      expect(result).not.toContain('--unused')
    })

    it('keeps used vars inside @media', async () => {
      const css = '@media (max-width: 600px) { :root { --dark: black } .foo { color: var(--dark) } }'
      const result = await run(css)
      expect(result).toContain('--dark: black')
    })

    it('handles vars inside @layer', async () => {
      const css = '@layer theme { :root { --unused: red; --used: blue } } .foo { color: var(--used) }'
      const result = await run(css)
      expect(result).not.toContain('--unused')
      expect(result).toContain('--used: blue')
    })
  })

  describe('edge cases', () => {
    it('handles empty input', async () => {
      expect(await run('')).toBe('')
    })

    it('handles CSS with no custom properties', async () => {
      const result = await run('.foo { color: red }')
      expect(result).toBe('.foo { color: red }')
    })

    it('handles var() with fallback — still counts as usage', async () => {
      const result = await run(':root { --x: red } .foo { color: var(--x, blue) }')
      expect(result).toContain('--x: red')
    })

    it('handles circular dependency without hanging', async () => {
      const css = ':root { --a: var(--b); --b: var(--a) } .foo { color: red }'
      const result = await run(css)
      // Both unused (circular, never consumed) — should be removed
      expect(result).not.toContain('--a')
      expect(result).not.toContain('--b')
    })

    it('handles var() in shorthand values', async () => {
      const css = ':root { --gap: 10px } .foo { margin: var(--gap) 0 var(--gap) 0 }'
      const result = await run(css)
      expect(result).toContain('--gap: 10px')
    })

    it('handles multiple var() refs to the same property', async () => {
      const css = ':root { --s: 5px } .foo { padding: var(--s) var(--s) }'
      const result = await run(css)
      expect(result).toContain('--s: 5px')
    })
  })
})

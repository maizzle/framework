import { describe, it, expect } from 'vitest'
import postcss from 'postcss'
import { resolveMaizzleImports } from '../../plugins/postcss/resolveMaizzleImports.ts'

async function run(css: string, userRoot?: string): Promise<string> {
  const result = await postcss([resolveMaizzleImports(userRoot)]).process(css, { from: undefined })
  return result.css
}

describe('resolveMaizzleImports', () => {
  it('rewrites @import "@maizzle/tailwindcss" to an absolute path', async () => {
    const out = await run('@import "@maizzle/tailwindcss";')
    expect(out).toMatch(/^@import "\/.+@maizzle\/tailwindcss\/index\.css";$/)
  })

  it('rewrites a subpath import', async () => {
    const out = await run('@import "@maizzle/tailwindcss/mso";')
    expect(out).toMatch(/^@import "\/.+@maizzle\/tailwindcss\/mso\.css";$/)
  })

  it('handles single-quoted imports', async () => {
    const out = await run(`@import '@maizzle/tailwindcss';`)
    expect(out).toMatch(/^@import "\/.+@maizzle\/tailwindcss\/index\.css";$/)
  })

  it('preserves trailing layer/condition tokens after the path', async () => {
    const out = await run('@import "@maizzle/tailwindcss" layer(base);')
    expect(out).toMatch(/^@import "\/.+@maizzle\/tailwindcss\/index\.css" layer\(base\);$/)
  })

  it('leaves unrelated imports untouched', async () => {
    const css = '@import "tailwindcss";'
    const out = await run(css)
    expect(out).toBe(css)
  })

  it('leaves relative imports untouched', async () => {
    const css = '@import "./theme.css";'
    const out = await run(css)
    expect(out).toBe(css)
  })

  it('does not match prefix-only matches like @maizzle/tailwindcss-something', async () => {
    const css = '@import "@maizzle/tailwindcss-extra";'
    const out = await run(css)
    expect(out).toBe(css)
  })

  it('falls back to framework copy when user root cannot resolve', async () => {
    // Pass a userRoot with no node_modules — must still resolve via framework
    const out = await run('@import "@maizzle/tailwindcss";', '/nonexistent/path')
    expect(out).toMatch(/^@import "\/.+@maizzle\/tailwindcss\/index\.css";$/)
  })

  it('rewrites multiple imports in one stylesheet', async () => {
    const out = await run([
      '@import "@maizzle/tailwindcss";',
      '@import "@maizzle/tailwindcss/mso";',
      '@import "tailwindcss";',
    ].join('\n'))

    const lines = out.trim().split('\n')
    expect(lines[0]).toMatch(/index\.css/)
    expect(lines[1]).toMatch(/mso\.css/)
    expect(lines[2]).toBe('@import "tailwindcss";')
  })

  it('leaves the rule untouched when neither user nor framework can resolve', async () => {
    // Spec doesn't exist anywhere; plugin should silently no-op
    const css = '@import "@maizzle/tailwindcss/does-not-exist-xyz";'
    const out = await run(css)
    expect(out).toBe(css)
  })
})

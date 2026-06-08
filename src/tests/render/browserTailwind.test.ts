import { describe, it, expect } from 'vitest'
import { compileTailwindCssBrowser } from '../../utils/compileTailwindCss.browser.ts'

const config = {} as any

describe('browser Tailwind compiler', () => {
  it('compiles utilities from inline candidates', async () => {
    const input = '@import "@maizzle/tailwindcss";\n@source inline("text-red-500 p-4");'
    const css = await compileTailwindCssBrowser(input, config, 'email.css')
    expect(css).toMatch(/\.text-red-500/)
    expect(css).toMatch(/\.p-4/)
    // lightningcss lowered oklch -> rgb for old targets
    expect(css).toMatch(/color:/)
  })

  it('resolves @maizzle/tailwindcss imports', async () => {
    const input = '@import "@maizzle/tailwindcss";\n@source inline("p-2");'
    const css = await compileTailwindCssBrowser(input, config, 'email.css')
    expect(css).toMatch(/\.p-2/)
  })

  it('emits a color declaration for color utilities', async () => {
    const input = '@import "@maizzle/tailwindcss";\n@source inline("text-blue-600");'
    const browser = await compileTailwindCssBrowser(input, config, 'email.css')
    expect(browser).toMatch(/\.text-blue-600/)
    expect(browser).toMatch(/color:/)
  })
})

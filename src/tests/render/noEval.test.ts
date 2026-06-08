import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { render } from '../../render/browser.ts'

/**
 * Faithfully simulate a V8-isolate edge runtime (Cloudflare Workers / Vercel
 * Edge) where `eval`/`new Function` are forbidden: replace `globalThis.Function`
 * with a proxy that throws when called/constructed (any codegen) but delegates
 * everything else (so `instanceof`, `.prototype`, `.call` still work). This
 * forces the renderer's interpreter (sval) path and surfaces any hidden eval
 * anywhere in the render pipeline.
 */
const RealFunction = globalThis.Function
const NoCodegenFunction = new Proxy(RealFunction, {
  apply() { throw new EvalError('Code generation from strings disallowed') },
  construct() { throw new EvalError('Code generation from strings disallowed') },
})

beforeAll(() => { globalThis.Function = NoCodegenFunction as unknown as FunctionConstructor })
afterAll(() => { globalThis.Function = RealFunction })

describe('render() under a no-eval (edge isolate) constraint', () => {
  it('renders built-ins + compiles/inlines Tailwind with no eval', async () => {
    const tpl = `
<template>
  <Html><Head></Head>
    <Body class="bg-gray-100">
      <Container class="p-4"><Heading class="text-xl font-bold">Edge OK</Heading></Container>
    </Body>
  </Html>
  <style>@import "@maizzle/tailwindcss";</style>
</template>`
    const { html } = await render(tpl, { css: { inline: true } })
    expect(html).toContain('Edge OK')
    expect(html).toMatch(/style="[^"]*(background-color|padding)/i)
  })

  it('renders shiki code component with no eval', async () => {
    const tpl = `<template><Html><Head></Head><Body><CodeBlock code="const x = 1" language="js" /></Body></Html></template>`
    const { html } = await render(tpl)
    expect(html).toMatch(/<pre|<code/i)
    expect(html).toContain('const')
  })

  it('renders pure HTML with no eval', async () => {
    const { html } = await render('<div class="p-2">edge html</div>', {})
    expect(html).toContain('edge html')
  })
})

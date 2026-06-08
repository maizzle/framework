import { describe, it, expect } from 'vitest'
import { render } from '../../render/browser.ts'

describe('browser render() e2e', () => {
  it('renders built-in components + compiles Tailwind + inlines CSS', async () => {
    const template = `
<template>
  <Html>
    <Head></Head>
    <Body class="bg-gray-100">
      <Container class="p-4">
        <Heading class="text-2xl font-bold">Welcome</Heading>
        <Button href="https://example.com" class="bg-blue-600 text-white">Go</Button>
      </Container>
    </Body>
  </Html>
  <style>@import "@maizzle/tailwindcss";</style>
</template>
`
    const { html } = await render(template, { css: { inline: true } })

    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('<html')
    expect(html).toContain('Welcome')
    expect(html).toContain('example.com')
    // Tailwind compiled + inlined onto an element (p-4 -> padding, bg -> background-color)
    expect(html).toMatch(/style="[^"]*(background-color|padding)/i)
  })

  it('renders pure HTML (no SFC) through the transformer pipeline', async () => {
    const html = `<!DOCTYPE html>
<html><head><style>@import "@maizzle/tailwindcss";</style></head>
<body><div class="bg-red-500 p-4">Plain HTML</div></body></html>`
    const out = await render(html, { css: { inline: true } })
    expect(out.html).toContain('Plain HTML')
    expect(out.html).toMatch(/style="[^"]*(background-color|padding)/i)
  })

  it('resolves a user-supplied component referenced by tag', async () => {
    const template = `
<template>
  <Html><Head></Head><Body><Badge label="New" /></Body></Html>
</template>
`
    const Badge = `
<script setup>
defineProps({ label: String })
</script>
<template><span class="inline-block px-2">{{ label }}</span></template>
`
    const { html } = await render(template, { components: { Badge } })
    // Component resolved and rendered its content inside <body>
    expect(html).toMatch(/<body[^>]*>[\s\S]*New[\s\S]*<\/body>/)
    expect(html).toContain('<span')
  })
})

import { describe, it, expect } from 'vitest'
import { render } from '../../render/browser.ts'

describe('markdown/code components (browser/edge)', () => {
  it('renders <CodeBlock> with shiki highlighting', async () => {
    const tpl = `<template><Html><Head></Head><Body><CodeBlock code="const x = 1" language="js" /></Body></Html></template>`
    const { html } = await render(tpl)
    // shiki emits inline-styled spans for tokens
    expect(html).toMatch(/<pre|<code/i)
    expect(html).toMatch(/style="[^"]*color/i)
    expect(html).toContain('const')
  })

  it('renders <Markdown> content', async () => {
    const tpl = `<template><Html><Head></Head><Body><Markdown content="# Title

Some **bold** text." /></Body></Html></template>`
    const { html } = await render(tpl)
    expect(html).toMatch(/<h1[^>]*>\s*Title/i)
    expect(html).toMatch(/<strong>bold<\/strong>/i)
  })
})

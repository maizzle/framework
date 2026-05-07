import { describe, it, expect } from 'vitest'
import { createSSRApp, h, Suspense } from 'vue'
import { renderToString } from '@vue/server-renderer'
import NotPlaintext from '../../components/NotPlaintext.vue'

function render(slotContent: string) {
  const app = createSSRApp({
    render: () => h(Suspense, null, {
      default: () => h(NotPlaintext, null, { default: () => slotContent }),
    }),
  })
  return renderToString(app)
}

describe('NotPlaintext', () => {
  it('emits a div with the html-only marker attribute', async () => {
    const html = await render('html-only text')

    expect(html).toContain('data-maizzle-html-only')
    expect(html).toContain('html-only text')
    expect(html).toMatch(/^<div\b/)
  })

  it('does not add any styling to the wrapper', async () => {
    const html = await render('x')

    expect(html).not.toMatch(/style=/)
    expect(html).not.toMatch(/class=/)
  })
})

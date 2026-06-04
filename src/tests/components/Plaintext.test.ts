import { describe, it, expect } from 'vitest'
import { createSSRApp, h, Suspense } from 'vue'
import { renderToString } from '@vue/server-renderer'
import Plaintext from '../../components/Plaintext.vue'

function render(slotContent: string) {
  const app = createSSRApp({
    render: () => h(Suspense, null, {
      default: () => h(Plaintext, null, { default: () => slotContent }),
    }),
  })
  return renderToString(app)
}

describe('Plaintext', () => {
  it('emits a div with the plaintext-only marker attribute', async () => {
    const html = await render('hidden text')

    expect(html).toContain('data-maizzle-plaintext-only')
    expect(html).toContain('hidden text')
    expect(html).toMatch(/^<div\b/)
  })

  it('does not add any styling to the wrapper', async () => {
    const html = await render('x')

    expect(html).not.toMatch(/style=/)
    expect(html).not.toMatch(/class=/)
  })
})

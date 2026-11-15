import { describe, it, expect } from 'vitest'
import { createSSRApp, h, Suspense } from 'vue'
import { renderToString } from '@vue/server-renderer'
import Plaintext from '../../components/Plaintext.vue'
import { RenderContextKey, type RenderContext } from '../../composables/renderContext.ts'

function render(slotContent: string, ctx?: RenderContext) {
  const app = createSSRApp({
    render: () => h(Suspense, null, {
      default: () => h(Plaintext, null, { default: () => slotContent }),
    }),
  })
  if (ctx) app.provide(RenderContextKey, ctx)
  return renderToString(app).then(html => html.replace(/<!--\[-->|<!--\]-->/g, ''))
}

describe('Plaintext', () => {
  it('wraps content in plaintext-only markers', async () => {
    const ctx: RenderContext = { sfcEventHandlers: [] }
    const html = await render('hidden text', ctx)

    expect(html).toContain(`__MZPT_${ctx.nonce}_1_S__hidden text__MZPT_${ctx.nonce}_1_E__`)
  })

  it('does not add a wrapper element', async () => {
    const html = await render('x', { sfcEventHandlers: [] })

    expect(html).not.toMatch(/<div/)
  })

  it('renders nothing outside a Maizzle render', async () => {
    const html = await render('hidden text')

    expect(html).not.toContain('hidden text')
  })
})

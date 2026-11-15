import { describe, it, expect } from 'vitest'
import { createSSRApp, h, Suspense } from 'vue'
import { renderToString } from '@vue/server-renderer'
import NotPlaintext from '../../components/NotPlaintext.vue'
import { RenderContextKey, type RenderContext } from '../../composables/renderContext.ts'

function render(slotContent: string, ctx?: RenderContext) {
  const app = createSSRApp({
    render: () => h(Suspense, null, {
      default: () => h(NotPlaintext, null, { default: () => slotContent }),
    }),
  })
  if (ctx) app.provide(RenderContextKey, ctx)
  return renderToString(app).then(html => html.replace(/<!--\[-->|<!--\]-->/g, ''))
}

describe('NotPlaintext', () => {
  it('wraps content in html-only markers', async () => {
    const ctx: RenderContext = { sfcEventHandlers: [] }
    const html = await render('html-only text', ctx)

    expect(html).toContain(`__MZHO_${ctx.nonce}_1_S__html-only text__MZHO_${ctx.nonce}_1_E__`)
  })

  it('does not add a wrapper element', async () => {
    const html = await render('x', { sfcEventHandlers: [] })

    expect(html).not.toMatch(/<div/)
  })

  it('renders content as-is outside a Maizzle render', async () => {
    const html = await render('html-only text')

    expect(html).toContain('html-only text')
    expect(html).not.toContain('__MZ')
  })
})

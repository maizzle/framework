import { describe, it, expect } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from '@vue/server-renderer'
import Html from '../../components/Html.vue'
import { RenderContextKey } from '../../composables/renderContext.ts'

async function render(props = {}, attrs = {}, slotContent = '') {
  const app = createSSRApp({
    render: () => h(Html, { ...props, ...attrs }, { default: () => slotContent })
  })

  return renderToString(app)
}

describe('Html', () => {
  it('renders an html element', async () => {
    const html = await render()
    expect(html).toContain('<html')
    expect(html).toContain('</html>')
  })

  it('defaults lang to en', async () => {
    const html = await render()
    expect(html).toContain('lang="en"')
  })

  it('defaults dir to ltr', async () => {
    const html = await render()
    expect(html).toContain('dir="ltr"')
  })

  it('accepts custom lang', async () => {
    const html = await render({ lang: 'fr' })
    expect(html).toContain('lang="fr"')
  })

  it('accepts rtl direction', async () => {
    const html = await render({ dir: 'rtl' })
    expect(html).toContain('dir="rtl"')
  })

  it('includes xmlns VML/Office namespaces by default', async () => {
    const html = await render()
    expect(html).toContain('xmlns:v="urn:schemas-microsoft-com:vml"')
    expect(html).toContain('xmlns:o="urn:schemas-microsoft-com:office:office"')
  })

  it('excludes xmlns namespaces when xmlns is false', async () => {
    const html = await render({ xmlns: false })
    expect(html).not.toContain('xmlns')
  })

  it('renders slot content', async () => {
    const html = await render({}, {}, 'Content')
    expect(html).toContain('Content')
  })

  it('passes extra attrs to html element', async () => {
    const html = await render({}, { class: 'test' })
    expect(html).toContain('class="test"')
  })

  it('omits xmlns namespaces when outlookFallback is false', async () => {
    const html = await render({ outlookFallback: false })
    expect(html).not.toContain('xmlns:v')
    expect(html).not.toContain('xmlns:o')
  })

  it('accepts doctype prop without emitting it inline', async () => {
    const html = await render({ doctype: '<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01//EN">' })
    expect(html).toContain('<html')
    expect(html).not.toContain('<!DOCTYPE')
  })

  it('writes the doctype prop into an active render context', async () => {
    const ctx: any = {}
    const app = createSSRApp({
      render: () => h(Html, { doctype: '<!DOCTYPE custom>' }, { default: () => '' }),
    })
    app.provide(RenderContextKey, ctx)
    await renderToString(app)
    expect(ctx.doctype).toBe('<!DOCTYPE custom>')
  })

  it('renders boolean attributes as bare attribute names', async () => {
    const html = await render({}, { hidden: true })
    expect(html).toMatch(/<html[^>]*\bhidden\b/)
  })
})

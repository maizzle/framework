import { describe, it, expect } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from '@vue/server-renderer'
import Html from '../../components/Html.vue'

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

  it('does not add xmlns attrs by default', async () => {
    const html = await render()
    expect(html).not.toContain('xmlns')
  })

  it('adds xmlns and VML/Office namespaces when xmlns is set', async () => {
    const html = await render({ xmlns: 'http://www.w3.org/1999/xhtml' })
    expect(html).toContain('xmlns="http://www.w3.org/1999/xhtml"')
    expect(html).toContain('xmlns:v="urn:schemas-microsoft-com:vml"')
    expect(html).toContain('xmlns:o="urn:schemas-microsoft-com:office:office"')
  })

  it('renders slot content', async () => {
    const html = await render({}, {}, 'Content')
    expect(html).toContain('Content')
  })

  it('passes extra attrs to html element', async () => {
    const html = await render({}, { class: 'test' })
    expect(html).toContain('class="test"')
  })
})

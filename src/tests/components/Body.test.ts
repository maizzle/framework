import { describe, it, expect } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from '@vue/server-renderer'
import Body from '../../components/Body.vue'

async function render(props = {}, attrs = {}, slotContent = '') {
  const app = createSSRApp({
    render: () => h(Body, { ...props, ...attrs }, { default: () => slotContent })
  })

  return renderToString(app)
}

describe('Body', () => {
  it('renders a body element', async () => {
    const html = await render()
    expect(html).toContain('<body')
    expect(html).toContain('</body>')
  })

  it('defaults xml:lang to en', async () => {
    const html = await render()
    expect(html).toContain('xml:lang="en"')
  })

  it('defaults dir to ltr', async () => {
    const html = await render()
    expect(html).toContain('dir="ltr"')
  })

  it('accepts custom xml:lang', async () => {
    const html = await render({ xmlLang: 'fr' })
    expect(html).toContain('xml:lang="fr"')
  })

  it('accepts rtl direction', async () => {
    const html = await render({ dir: 'rtl' })
    expect(html).toContain('dir="rtl"')
  })

  it('includes default inline styles', async () => {
    const html = await render()
    expect(html).toContain('margin: 0')
    expect(html).toContain('padding: 0')
    expect(html).toContain('width: 100%')
    expect(html).toContain('word-break: break-word')
  })

  it('renders slot content', async () => {
    const html = await render({}, {}, 'Content')
    expect(html).toContain('Content')
  })

  it('passes extra attrs to body element', async () => {
    const html = await render({}, { class: 'test' })
    expect(html).toContain('class="test"')
  })
})

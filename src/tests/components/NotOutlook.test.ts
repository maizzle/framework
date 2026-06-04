import { describe, it, expect } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from '@vue/server-renderer'
import NotOutlook from '../../components/NotOutlook.vue'

function render(slotFn?: () => any) {
  const app = createSSRApp({
    render: () => h(NotOutlook, null, {
      default: slotFn ?? (() => h('p', 'Test')),
    }),
  })
  return renderToString(app)
}

describe('NotOutlook', () => {
  describe('conditional comments', () => {
    it('renders the opening non-Outlook conditional comment', async () => {
      const html = await render()
      expect(html).toContain('<!--[if !mso]><!-->')
    })

    it('renders the closing comment', async () => {
      const html = await render()
      expect(html).toContain('<!--<![endif]-->')
    })

    it('renders slot content between the comments', async () => {
      const html = await render()
      expect(html).toContain('<p>Test</p>')
    })

    it('outputs comments and content in the correct order', async () => {
      const html = await render()

      const startIdx = html.indexOf('<!--[if !mso]><!-->')
      const contentIdx = html.indexOf('<p>Test</p>')
      const endIdx = html.indexOf('<!--<![endif]-->')

      expect(startIdx).toBeGreaterThanOrEqual(0)
      expect(startIdx).toBeLessThan(contentIdx)
      expect(contentIdx).toBeLessThan(endIdx)
    })
  })

  describe('slot content', () => {
    it('renders nested HTML in the slot', async () => {
      const html = await render(() => h('table', [h('tr', [h('td', 'Hello')])]))
      expect(html).toContain('<table>')
      expect(html).toContain('<td>Hello</td>')
    })

    it('renders with an empty slot', async () => {
      const app = createSSRApp({ render: () => h(NotOutlook) })
      const html = await renderToString(app)
      expect(html).toContain('<!--[if !mso]><!-->')
      expect(html).toContain('<!--<![endif]-->')
    })
  })
})

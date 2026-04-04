import { describe, it, expect } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from '@vue/server-renderer'
import Vml from '../../components/Vml.vue'

function render(props: Record<string, unknown> = {}, slotFn?: () => any) {
  const app = createSSRApp({
    render: () => h(Vml, props, {
      default: slotFn ?? (() => h('p', 'Test')),
    }),
  })

  return renderToString(app)
}

describe('Vml', () => {
  describe('defaults', () => {
    it('wraps slot content in VML conditional comments', async () => {
      const html = await render()

      expect(html).toContain('<!--[if mso]>')
      expect(html).toContain('<![endif]-->')
    })

    it('renders v:rect with default width of 600px', async () => {
      const html = await render()

      expect(html).toContain('<v:rect')
      expect(html).toContain('style="width: 600px;"')
    })

    it('uses default fill and stroke values', async () => {
      const html = await render()

      expect(html).toContain('fill="t"')
      expect(html).toContain('stroke="f"')
    })

    it('uses default fillcolor of none', async () => {
      const html = await render()

      expect(html).toContain('fillcolor="none"')
    })

    it('uses default src placeholder', async () => {
      const html = await render()

      expect(html).toContain('src="https://via.placeholder.com/600x400"')
    })

    it('uses default type of frame', async () => {
      const html = await render()

      expect(html).toContain('type="frame"')
    })

    it('uses default inset of 0,0,0,0', async () => {
      const html = await render()

      expect(html).toContain('inset="0,0,0,0"')
    })

    it('renders slot content between VML wrappers', async () => {
      const html = await render()

      expect(html).toContain('<p>Test</p>')
    })

    it('includes v:fill and v:textbox elements', async () => {
      const html = await render()

      expect(html).toContain('<v:fill')
      expect(html).toContain('<v:textbox')
    })

    it('sets mso-fit-shape-to-text on textbox', async () => {
      const html = await render()

      expect(html).toContain('mso-fit-shape-to-text: true')
    })

    it('includes vml namespace on v:rect', async () => {
      const html = await render()

      expect(html).toContain('xmlns:v="urn:schemas-microsoft-com:vml"')
    })
  })

  describe('width prop', () => {
    it('accepts a string value', async () => {
      const html = await render({ width: '400px' })

      expect(html).toContain('style="width: 400px;"')
    })

    it('accepts a number and adds px suffix', async () => {
      const html = await render({ width: 500 })

      expect(html).toContain('style="width: 500px;"')
    })
  })

  describe('height prop', () => {
    it('does not include height by default', async () => {
      const html = await render()

      expect(html).not.toContain('height:')
    })

    it('includes height when provided', async () => {
      const html = await render({ height: '300px' })

      expect(html).toContain('height: 300px;')
    })

    it('accepts a number and adds px suffix', async () => {
      const html = await render({ height: 250 })

      expect(html).toContain('height: 250px;')
    })
  })

  describe('fill props', () => {
    it('type sets v:fill type', async () => {
      const html = await render({ type: 'tile' })

      expect(html).toContain('type="tile"')
    })

    it('src sets v:fill src', async () => {
      const html = await render({ src: 'https://example.com/bg.jpg' })

      expect(html).toContain('src="https://example.com/bg.jpg"')
    })

    it('fillcolor sets fillcolor on v:rect', async () => {
      const html = await render({ fillcolor: '#ff0000' })

      expect(html).toContain('fillcolor="#ff0000"')
    })

    it('color sets color on v:fill', async () => {
      const html = await render({ color: '#0000ff' })

      expect(html).toContain('color="#0000ff"')
    })
  })

  describe('stroke props', () => {
    it('strokecolor enables stroke and sets color', async () => {
      const html = await render({ strokecolor: '#333333' })

      expect(html).toContain('stroke="t"')
      expect(html).toContain('strokecolor="#333333"')
    })
  })

  describe('optional v:fill attributes', () => {
    it('sets sizes when provided', async () => {
      const html = await render({ sizes: '100%' })

      expect(html).toContain('sizes="100%"')
    })

    it('sets aspect when provided', async () => {
      const html = await render({ aspect: 'atleast' })

      expect(html).toContain('aspect="atleast"')
    })

    it('sets origin when provided', async () => {
      const html = await render({ origin: '0,0' })

      expect(html).toContain('origin="0,0"')
    })

    it('sets position when provided', async () => {
      const html = await render({ position: '0.5,0.5' })

      expect(html).toContain('position="0.5,0.5"')
    })

    it('omits optional attributes when not provided', async () => {
      const html = await render()

      expect(html).not.toContain('sizes=')
      expect(html).not.toContain('aspect=')
      expect(html).not.toContain('origin=')
      expect(html).not.toContain('position=')
      expect(html).not.toMatch(/\scolor="/)
    })
  })

  describe('inset prop', () => {
    it('sets custom inset', async () => {
      const html = await render({ inset: '10,20,10,20' })

      expect(html).toContain('inset="10,20,10,20"')
    })
  })

  describe('closing comment', () => {
    it('includes closing VML tags in correct order', async () => {
      const html = await render()

      expect(html).toContain('</v:textbox></v:rect><![endif]-->')
    })
  })

  describe('structure', () => {
    it('outputs VML elements in correct order', async () => {
      const html = await render()

      const rectIdx = html.indexOf('<v:rect')
      const fillIdx = html.indexOf('<v:fill')
      const textboxIdx = html.indexOf('<v:textbox')
      const contentIdx = html.indexOf('<p>Test</p>')
      const closingIdx = html.indexOf('</v:textbox></v:rect>')

      expect(rectIdx).toBeLessThan(fillIdx)
      expect(fillIdx).toBeLessThan(textboxIdx)
      expect(textboxIdx).toBeLessThan(contentIdx)
      expect(contentIdx).toBeLessThan(closingIdx)
    })
  })
})

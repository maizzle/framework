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
    it('wraps slot content in MSO conditional comments', async () => {
      const html = await render()

      expect(html).toContain('<!--[if mso]>')
      expect(html).toContain('<![endif]-->')
    })

    it('renders v:rect by default', async () => {
      const html = await render()

      expect(html).toContain('<v:rect')
      expect(html).toContain('</v:rect>')
    })

    it('uses default width of 600px', async () => {
      const html = await render()

      expect(html).toContain('style="width: 600px;"')
    })

    it('uses default fill/stroke for rect (fill=true, stroke=false)', async () => {
      const html = await render()

      expect(html).toContain('fill="true"')
      expect(html).toContain('stroke="false"')
    })

    it('omits v:fill when no fill-related prop is set', async () => {
      const html = await render()

      expect(html).not.toContain('<v:fill')
    })

    it('renders v:textbox with default inset and mso-fit-shape-to-text', async () => {
      const html = await render()

      expect(html).toContain('<v:textbox inset="0,0,0,0"')
      expect(html).toContain('mso-fit-shape-to-text: true')
    })

    it('renders slot content', async () => {
      const html = await render()

      expect(html).toContain('<p>Test</p>')
    })

    it('includes vml namespace on shape element', async () => {
      const html = await render()

      expect(html).toContain('xmlns:v="urn:schemas-microsoft-com:vml"')
    })
  })

  describe('shape: rect', () => {
    it('emits v:rect when shape="rect"', async () => {
      const html = await render({ shape: 'rect' })

      expect(html).toContain('<v:rect')
      expect(html).toContain('</v:rect>')
    })
  })

  describe('shape: roundrect', () => {
    it('emits v:roundrect', async () => {
      const html = await render({ shape: 'roundrect' })

      expect(html).toContain('<v:roundrect')
      expect(html).toContain('</v:roundrect>')
    })

    it('emits arcsize attribute when set', async () => {
      const html = await render({ shape: 'roundrect', arcsize: '0.1' })

      expect(html).toContain('arcsize="0.1"')
    })

    it('omits arcsize on non-roundrect shapes', async () => {
      const html = await render({ shape: 'rect', arcsize: '0.1' })

      expect(html).not.toContain('arcsize=')
    })
  })

  describe('shape: oval', () => {
    it('emits v:oval', async () => {
      const html = await render({ shape: 'oval' })

      expect(html).toContain('<v:oval')
      expect(html).toContain('</v:oval>')
    })

    it('keeps width/height style on oval', async () => {
      const html = await render({ shape: 'oval', width: 100, height: 100 })

      expect(html).toContain('style="width: 100px; height: 100px;"')
    })
  })

  describe('shape: line', () => {
    it('emits v:line', async () => {
      const html = await render({ shape: 'line', from: '0,0', to: '600,0' })

      expect(html).toContain('<v:line')
      expect(html).toContain('</v:line>')
    })

    it('emits from/to attributes', async () => {
      const html = await render({ shape: 'line', from: '0,0', to: '600,0' })

      expect(html).toContain('from="0,0"')
      expect(html).toContain('to="600,0"')
    })

    it('omits width/height style for line', async () => {
      const html = await render({ shape: 'line', from: '0,0', to: '600,0' })

      expect(html).not.toContain('style="width:')
      expect(html).not.toContain('style="width: ')
    })

    it('defaults fill=false and stroke=true for line', async () => {
      const html = await render({ shape: 'line', from: '0,0', to: '600,0' })

      expect(html).toContain('fill="false"')
      expect(html).toContain('stroke="true"')
    })

    it('still wraps slot content in v:textbox for uniform contract', async () => {
      const html = await render({ shape: 'line', from: '0,0', to: '600,0' }, () => h('p', 'LineContent'))

      expect(html).toContain('<v:textbox')
      expect(html).toContain('<p>LineContent</p>')
    })
  })

  describe('fill child', () => {
    it('emits v:fill when src is set', async () => {
      const html = await render({ src: 'https://example.com/bg.jpg' })

      expect(html).toContain('<v:fill')
      expect(html).toContain('src="https://example.com/bg.jpg"')
    })

    it('emits v:fill when type is set', async () => {
      const html = await render({ type: 'solid' })

      expect(html).toContain('<v:fill')
      expect(html).toContain('type="solid"')
    })

    it('emits v:fill when color is set', async () => {
      const html = await render({ color: '#ff0000' })

      expect(html).toContain('<v:fill')
      expect(html).toContain('color="#ff0000"')
    })

    it('omits v:fill when only fillcolor is set on the shape', async () => {
      const html = await render({ fillcolor: '#ff0000' })

      expect(html).not.toContain('<v:fill')
      expect(html).toContain('fillcolor="#ff0000"')
    })
  })

  describe('gradient attributes', () => {
    it('emits color2', async () => {
      const html = await render({ type: 'gradient', color: '#ff0000', color2: '#0000ff' })

      expect(html).toContain('color2="#0000ff"')
    })

    it('emits angle', async () => {
      const html = await render({ type: 'gradient', angle: 90 })

      expect(html).toContain('angle="90"')
    })

    it('emits focus', async () => {
      const html = await render({ type: 'gradient', focus: 50 })

      expect(html).toContain('focus="50"')
    })

    it('emits focussize', async () => {
      const html = await render({ type: 'gradientradial', focussize: '0,0' })

      expect(html).toContain('focussize="0,0"')
    })

    it('emits focusposition', async () => {
      const html = await render({ type: 'gradientradial', focusposition: '0.5,0.5' })

      expect(html).toContain('focusposition="0.5,0.5"')
    })

    it('any gradient attr alone triggers v:fill emission', async () => {
      const html = await render({ angle: 45 })

      expect(html).toContain('<v:fill')
      expect(html).toContain('angle="45"')
    })
  })

  describe('stroke and fill props', () => {
    it('strokecolor enables stroke', async () => {
      const html = await render({ strokecolor: '#333333' })

      expect(html).toContain('stroke="true"')
      expect(html).toContain('strokecolor="#333333"')
    })

    it('fillcolor on shape element', async () => {
      const html = await render({ fillcolor: '#3b82f6' })

      expect(html).toContain('fillcolor="#3b82f6"')
    })

    it('explicit fill=false on rect overrides default', async () => {
      const html = await render({ fill: false })

      expect(html).toContain('fill="false"')
    })

    it('explicit stroke=true on rect overrides default', async () => {
      const html = await render({ stroke: true })

      expect(html).toContain('stroke="true"')
    })
  })

  describe('backgroundPosition', () => {
    it('maps top,left to origin/position', async () => {
      const html = await render({ src: 'x.jpg', backgroundPosition: 'top,left' })

      expect(html).toContain('origin="-0.5,-0.5"')
      expect(html).toContain('position="-0.5,-0.5"')
    })

    it('maps bottom,right to origin/position', async () => {
      const html = await render({ src: 'x.jpg', backgroundPosition: 'bottom,right' })

      expect(html).toContain('origin="0.5,0.5"')
      expect(html).toContain('position="0.5,0.5"')
    })

    it('explicit origin/position overrides backgroundPosition', async () => {
      const html = await render({ src: 'x.jpg', backgroundPosition: 'top,left', origin: '0,0', position: '1,1' })

      expect(html).toContain('origin="0,0"')
      expect(html).toContain('position="1,1"')
    })
  })

  describe('inset', () => {
    it('sets custom inset', async () => {
      const html = await render({ inset: '10,20,10,20' })

      expect(html).toContain('inset="10,20,10,20"')
    })
  })

  describe('width / height', () => {
    it('accepts number width as px', async () => {
      const html = await render({ width: 400 })

      expect(html).toContain('style="width: 400px;"')
    })

    it('omits height by default', async () => {
      const html = await render()

      expect(html).not.toContain('height:')
    })

    it('emits height when set', async () => {
      const html = await render({ height: 300 })

      expect(html).toContain('height: 300px;')
    })
  })

  describe('structure', () => {
    it('rect: shape > fill > textbox > content order', async () => {
      const html = await render({ src: 'https://example.com/bg.jpg' })

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

    it('closes matching element for chosen shape', async () => {
      const html = await render({ shape: 'roundrect' })

      expect(html).toContain('</v:textbox></v:roundrect><![endif]-->')
    })
  })
})

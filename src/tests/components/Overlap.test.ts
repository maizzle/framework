import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import Overlap from '../../components/Overlap.vue'

async function ssr(props = {}, slots: Record<string, () => unknown> = { default: () => 'bg', overlay: () => 'ov' }) {
  return renderToString(createSSRApp({
    render() { return h(Overlap, props, slots) }
  }))
}

function mountOverlap(props = {}, defaultSlot = 'Background', overlaySlot = 'Overlay') {
  return mount(Overlap, {
    props: { height: 340, width: 600, ...props },
    slots: {
      default: () => defaultSlot,
      overlay: () => overlaySlot
    }
  })
}

describe('Overlap', () => {
  describe('background content', () => {
    it('renders background slot in a div', () => {
      const wrapper = mountOverlap()
      const bg = wrapper.find('div')
      expect(bg.text()).toContain('Background')
    })

    it('sets max-height from prop', () => {
      const wrapper = mountOverlap({ height: 340 })
      expect(wrapper.find('div').attributes('style')).toContain('max-height: 340px')
    })

    it('accepts max-height as string with units', () => {
      const wrapper = mountOverlap({ height: '20rem' })
      expect(wrapper.find('div').attributes('style')).toContain('max-height: 20rem')
    })

    it('centers the background div', () => {
      const wrapper = mountOverlap()
      const style = wrapper.find('div').attributes('style')
      expect(style).toContain('margin: 0px auto')
      expect(style).toContain('text-align: center')
    })

    it('passes extra attrs to the background div', () => {
      const wrapper = mount(Overlap, {
        props: { height: 340, width: 600 },
        attrs: { class: 'sm:max-h-[170px]' },
        slots: { default: () => 'bg', overlay: () => 'ov' }
      })
      expect(wrapper.find('div').classes()).toContain('sm:max-h-[170px]')
    })
  })

  describe('overlay structure', () => {
    it('renders overlay table with max-height: 0', () => {
      const wrapper = mountOverlap()
      const table = wrapper.find('table')
      expect(table.attributes('style')).toContain('max-height: 0')
    })

    it('sets position relative and opacity on overlay table', () => {
      const wrapper = mountOverlap()
      const style = wrapper.find('table').attributes('style')
      expect(style).toContain('position: relative')
      expect(style).toContain('opacity: 0.999')
    })

    it('sets width on td as CSS', () => {
      const wrapper = mountOverlap({ width: 600 })
      const style = wrapper.find('td').attributes('style')
      expect(style).toContain('width: 600px')
    })

    it('sets max-width 100% on td for responsiveness', () => {
      const wrapper = mountOverlap({ width: 600 })
      expect(wrapper.find('td').attributes('style')).toContain('max-width: 100%')
    })

    it('renders overlay slot content', () => {
      const wrapper = mountOverlap()
      expect(wrapper.find('td').text()).toContain('Overlay')
    })
  })

  describe('VML for Outlook', () => {
    it('renders VML conditional comments', () => {
      const wrapper = mountOverlap()
      const html = wrapper.html()
      expect(html).toContain('<!--[if mso]>')
      expect(html).toContain('<![endif]-->')
    })

    it('renders v:rect with correct width', () => {
      const wrapper = mountOverlap({ width: 600 })
      expect(wrapper.html()).toContain('width: 600px')
    })

    it('renders v:rect with height as default msoHeight', () => {
      const wrapper = mountOverlap({ height: 340 })
      expect(wrapper.html()).toContain('height: 340px')
    })

    it('uses msoHeight when provided', () => {
      const wrapper = mountOverlap({ height: 340, msoHeight: 300 })
      expect(wrapper.html()).toContain('height: 300px')
    })

    it('uses msoInset as the textbox inset value', () => {
      const wrapper = mountOverlap({ msoInset: '0,-60px,0,0' })
      expect(wrapper.html()).toContain('inset="0,-60px,0,0"')
    })

    it('defaults msoInset to 0,-60px,0,0', () => {
      const wrapper = mountOverlap()
      expect(wrapper.html()).toContain('inset="0,-60px,0,0"')
    })

    it('renders v:rect with stroked and filled f', () => {
      const html = mountOverlap().html()
      expect(html).toContain('stroked="f"')
      expect(html).toContain('filled="f"')
    })

    it('includes VML closing tags', () => {
      const html = mountOverlap().html()
      expect(html).toContain('</v:textbox></v:rect>')
    })
  })

  describe('width inheritance', () => {
    it('emits a width placeholder on td and VML when no width prop is set', async () => {
      const html = await ssr({ height: 340 })
      expect(html).toMatch(/<td style="width: __MAIZZLE_COLW_o\d+__/)
      expect(html).toMatch(/<v:rect[^>]*style="width: __MAIZZLE_COLW_o\d+__/)
    })

    it('uses the same id for td width, VML width, and the cw-id anchor', async () => {
      const html = await ssr({ height: 340 })
      const id = html.match(/data-maizzle-cw-id="(o\d+)"/)?.[1]
      expect(id).toMatch(/^o\d+$/)
      expect(html).toContain(`data-maizzle-cw-count="1"`)
      expect(html).toContain(`<td style="width: __MAIZZLE_COLW_${id}__`)
      expect(html).toContain(`<v:rect xmlns:v="urn:schemas-microsoft-com:vml" stroked="f" filled="f" style="width: __MAIZZLE_COLW_${id}__`)
    })

    it('does not emit a placeholder when width prop is set', async () => {
      const html = await ssr({ height: 340, width: 600 })
      expect(html).not.toContain('__MAIZZLE_COLW_')
      expect(html).not.toContain('data-maizzle-cw-id')
      expect(html).not.toContain('data-maizzle-cw-count')
    })

    it('emits data-maizzle-cw-self when a width class is on the component', async () => {
      const _html = await ssr({}, {
        default: () => 'bg',
        overlay: () => 'ov'
      }).then((s) => s)
      // re-render with class via SSR helper
      const html2 = await renderToString(createSSRApp({
        render() {
          return h(Overlap, { class: 'max-w-xl' }, { default: () => 'bg', overlay: () => 'ov' })
        }
      }))
      expect(html2).toMatch(/data-maizzle-cw-self(?:=""|\s|>)/)
      expect(html2).toMatch(/<td style="width: __MAIZZLE_COLW_o\d+__/)
    })

    it('emits data-maizzle-oh-id when a height class is on the component and no height prop', async () => {
      const html = await renderToString(createSSRApp({
        render() {
          return h(Overlap, { class: 'h-50' }, { default: () => 'bg', overlay: () => 'ov' })
        }
      }))
      expect(html).toMatch(/data-maizzle-oh-id="o\d+"/)
      expect(html).toMatch(/<v:rect[^>]*height: __MAIZZLE_OH_o\d+__/)
    })

    it('does not emit data-maizzle-oh-id when height prop is set', async () => {
      const html = await renderToString(createSSRApp({
        render() {
          return h(Overlap, { class: 'h-50', height: 340 }, { default: () => 'bg', overlay: () => 'ov' })
        }
      }))
      expect(html).not.toContain('data-maizzle-oh-id')
      expect(html).not.toContain('__MAIZZLE_OH_')
    })
  })
})

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Spacer from '../../components/Spacer.vue'

describe('Spacer', () => {
  describe('vertical', () => {
    it('renders a div with role="separator"', () => {
      const wrapper = mount(Spacer)
      expect(wrapper.html()).toContain('role="separator"')
    })

    it('renders without inline style by default', () => {
      const wrapper = mount(Spacer)
      expect(wrapper.html()).not.toContain('style=')
    })

    it('contains zero-width joiner', () => {
      const wrapper = mount(Spacer)
      expect(wrapper.text()).toContain('\u200D')
    })

    it('passes through user leading-* class', () => {
      const wrapper = mount(Spacer, { attrs: { class: 'leading-8' } })
      expect(wrapper.html()).toContain('leading-8')
    })

    it('passes through arbitrary mso-line-height-alt class', () => {
      const wrapper = mount(Spacer, {
        attrs: { class: 'leading-8 [mso-line-height-alt:40px]' },
      })
      const html = wrapper.html()
      expect(html).toContain('leading-8')
      expect(html).toContain('[mso-line-height-alt:40px]')
    })

    it('rewrites h-* to leading-*', () => {
      const wrapper = mount(Spacer, { attrs: { class: 'h-4' } })
      const html = wrapper.html()
      expect(html).toContain('leading-4')
      expect(html).not.toContain('h-4')
    })

    it('rewrites arbitrary h-[3px] to leading-[3px]', () => {
      const wrapper = mount(Spacer, { attrs: { class: 'h-[3px]' } })
      const html = wrapper.html()
      expect(html).toContain('leading-[3px]')
      expect(html).not.toContain('h-[3px]')
    })

    it('drops h-* when leading-* also passed', () => {
      const wrapper = mount(Spacer, { attrs: { class: 'h-4 leading-none' } })
      const html = wrapper.html()
      expect(html).toContain('leading-none')
      expect(html).not.toContain('h-4')
      expect(html).not.toContain('leading-4')
    })

    it('preserves other classes alongside h-* rewrite', () => {
      const wrapper = mount(Spacer, { attrs: { class: 'h-4 my-2' } })
      const html = wrapper.html()
      expect(html).toContain('my-2')
      expect(html).toContain('leading-4')
      expect(html).not.toContain('h-4')
    })
  })

  describe('horizontal type', () => {
    it('renders an <i> element', () => {
      const wrapper = mount(Spacer, { props: { type: 'horizontal' } })
      expect(wrapper.find('i').exists()).toBe(true)
    })

    it('uses default width of 16px', () => {
      const wrapper = mount(Spacer, { props: { type: 'horizontal' } })
      expect(wrapper.html()).toContain('width: 16px')
    })

    it('sets display inline-block', () => {
      const wrapper = mount(Spacer, { props: { type: 'horizontal' } })
      expect(wrapper.html()).toContain('display: inline-block')
    })

    it('sets font-size to 16px for predictable emsp width', () => {
      const wrapper = mount(Spacer, { props: { type: 'horizontal' } })
      expect(wrapper.html()).toContain('font-size: 16px')
    })

    it('accepts width as number', () => {
      const wrapper = mount(Spacer, { props: { type: 'horizontal', width: 32 } })
      expect(wrapper.html()).toContain('width: 32px')
    })

    it('accepts width as string', () => {
      const wrapper = mount(Spacer, { props: { type: 'horizontal', width: '48px' } })
      expect(wrapper.html()).toContain('width: 48px')
    })

    it('sets mso-font-width to 100% for 16px width', () => {
      const wrapper = mount(Spacer, { props: { type: 'horizontal', width: 16 } })
      expect(wrapper.html()).toContain('mso-font-width: 100%')
    })

    it('sets mso-font-width to 200% for 32px width', () => {
      const wrapper = mount(Spacer, { props: { type: 'horizontal', width: 32 } })
      expect(wrapper.html()).toContain('mso-font-width: 200%')
    })

    it('uses multiple emsps for widths over 80px', () => {
      const wrapper = mount(Spacer, { props: { type: 'horizontal', width: 360 } })
      const html = wrapper.find('i').html()
      // 360 / 80 = 4.5, ceil = 5 emsps - count em space characters in the HTML
      const emspCount = (html.match(/\u2003/g) || []).length
      expect(emspCount).toBe(5)
    })

    it('caps mso-font-width at 500%', () => {
      const wrapper = mount(Spacer, { props: { type: 'horizontal', width: 360 } })
      const html = wrapper.html()
      const match = html.match(/mso-font-width: (\d+)%/)
      expect(match).toBeTruthy()
      expect(Number(match![1])).toBeLessThanOrEqual(500)
    })

    it('calculates correct mso-font-width for 360px', () => {
      const wrapper = mount(Spacer, { props: { type: 'horizontal', width: 360 } })
      // 5 emsps × 16px = 80px base, 360/80 = 4.5 → 450%
      expect(wrapper.html()).toContain('mso-font-width: 450%')
    })
  })

  describe('outlookFallback=false', () => {
    it('omits mso-font-width on horizontal', () => {
      const html = mount(Spacer, {
        props: { outlookFallback: false, type: 'horizontal', width: 32 },
      }).html()
      expect(html).not.toContain('mso-font-width')
    })
  })
})

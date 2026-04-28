import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Spacer from '../../components/Spacer.vue'

describe('Spacer', () => {
  describe('defaults', () => {
    it('renders a div with role="separator"', () => {
      const wrapper = mount(Spacer)
      expect(wrapper.html()).toContain('role="separator"')
    })

    it('renders without style attribute when no height is set', () => {
      const wrapper = mount(Spacer)
      expect(wrapper.html()).not.toContain('line-height:')
    })

    it('contains zero-width joiner', () => {
      const wrapper = mount(Spacer)
      expect(wrapper.text()).toContain('\u200D')
    })
  })

  describe('height prop', () => {
    it('sets line-height when provided as string', () => {
      const wrapper = mount(Spacer, { props: { height: '32px' } })
      expect(wrapper.html()).toContain('line-height: 32px')
    })

    it('accepts a number and adds px suffix', () => {
      const wrapper = mount(Spacer, { props: { height: 24 } })
      expect(wrapper.html()).toContain('line-height: 24px')
    })

    it('preserves non-numeric string values', () => {
      const wrapper = mount(Spacer, { props: { height: '2rem' } })
      expect(wrapper.html()).toContain('line-height: 2rem')
    })
  })

  describe('msoHeight prop', () => {
    it('sets mso-line-height-alt', () => {
      const wrapper = mount(Spacer, { props: { height: '32px', msoHeight: '40px' } })
      expect(wrapper.html()).toContain('mso-line-height-alt: 40px')
    })

    it('accepts a number and adds px suffix', () => {
      const wrapper = mount(Spacer, { props: { height: '32px', msoHeight: 48 } })
      expect(wrapper.html()).toContain('mso-line-height-alt: 48px')
    })
  })

  describe('conditional rendering', () => {
    it('renders with style when height is provided', () => {
      const wrapper = mount(Spacer, { props: { height: '16px' } })
      expect(wrapper.html()).toContain('style=')
    })

    it('renders without style when no height is provided', () => {
      const wrapper = mount(Spacer)
      expect(wrapper.html()).not.toContain('style=')
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
    it('omits mso-line-height-alt on vertical', () => {
      const html = mount(Spacer, {
        props: { outlookFallback: false, height: 32, msoHeight: 24 },
      }).html()
      expect(html).toContain('line-height: 32px')
      expect(html).not.toContain('mso-line-height-alt')
    })

    it('omits mso-font-width on horizontal', () => {
      const html = mount(Spacer, {
        props: { outlookFallback: false, type: 'horizontal', width: 32 },
      }).html()
      expect(html).not.toContain('mso-font-width')
    })
  })
})

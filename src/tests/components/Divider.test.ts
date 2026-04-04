import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Divider from '../../components/Divider.vue'

describe('Divider', () => {
  describe('defaults', () => {
    it('renders a div with role="separator"', () => {
      const wrapper = mount(Divider)
      expect(wrapper.html()).toContain('role="separator"')
    })

    it('uses 1px height by default', () => {
      const wrapper = mount(Divider)
      expect(wrapper.html()).toContain('height: 1px')
      expect(wrapper.html()).toContain('line-height: 1px')
    })

    it('uses default background color', () => {
      const wrapper = mount(Divider)
      expect(wrapper.html()).toContain('background-color: #cbd5e1')
    })

    it('applies default spaceY margins', () => {
      const wrapper = mount(Divider)
      // happy-dom collapses margin-top/bottom into shorthand
      expect(wrapper.html()).toContain('margin: 24px 0px')
    })

    it('contains zero-width joiner', () => {
      const wrapper = mount(Divider)
      expect(wrapper.text()).toContain('\u200D')
    })
  })

  describe('height prop', () => {
    it('accepts a string value', () => {
      const wrapper = mount(Divider, { props: { height: '2px' } })
      expect(wrapper.html()).toContain('height: 2px')
      expect(wrapper.html()).toContain('line-height: 2px')
    })

    it('accepts a number and adds px suffix', () => {
      const wrapper = mount(Divider, { props: { height: 3 } })
      expect(wrapper.html()).toContain('height: 3px')
      expect(wrapper.html()).toContain('line-height: 3px')
    })
  })

  describe('color prop', () => {
    it('overrides the default background color', () => {
      const wrapper = mount(Divider, { props: { color: '#ff0000' } })
      expect(wrapper.html()).toContain('background-color: #ff0000')
      expect(wrapper.html()).not.toContain('background-color: #cbd5e1')
    })
  })

  describe('spacing props', () => {
    it('spaceY sets top and bottom margins', () => {
      const wrapper = mount(Divider, { props: { spaceY: '16px' } })
      expect(wrapper.html()).toContain('margin: 16px 0px')
    })

    it('spaceY accepts a number', () => {
      const wrapper = mount(Divider, { props: { spaceY: 10 } })
      expect(wrapper.html()).toContain('margin: 10px 0px')
    })

    it('spaceY of 0 outputs 0px', () => {
      const wrapper = mount(Divider, { props: { spaceY: 0 } })
      expect(wrapper.html()).toContain('margin: 0px')
    })

    it('spaceX sets left and right margins', () => {
      const wrapper = mount(Divider, { props: { spaceX: '32px' } })
      // spaceY default (24px) still applies alongside spaceX
      expect(wrapper.html()).toContain('margin: 24px 32px')
    })

    it('spaceX of 0 outputs 0px for horizontal margins', () => {
      const wrapper = mount(Divider, { props: { spaceX: 0 } })
      // spaceY default (24px) still applies
      expect(wrapper.html()).toContain('margin: 24px 0px')
    })
  })

  describe('individual margin props', () => {
    it('top sets margin-top', () => {
      const wrapper = mount(Divider, { props: { top: '8px' } })
      expect(wrapper.html()).toContain('8px')
    })

    it('bottom sets margin-bottom', () => {
      const wrapper = mount(Divider, { props: { bottom: '12px' } })
      expect(wrapper.html()).toContain('12px')
    })

    it('left sets margin-left', () => {
      const wrapper = mount(Divider, { props: { left: '4px' } })
      expect(wrapper.html()).toContain('4px')
    })

    it('right sets margin-right', () => {
      const wrapper = mount(Divider, { props: { right: '4px' } })
      expect(wrapper.html()).toContain('4px')
    })

    it('individual margins accept numbers', () => {
      const wrapper = mount(Divider, { props: { top: 5, bottom: 10 } })
      const html = wrapper.html()
      expect(html).toContain('5px')
      expect(html).toContain('10px')
    })

    it('individual margin overrides spaceY', () => {
      const wrapper = mount(Divider, { props: { spaceY: '24px', top: '8px' } })
      // margin shorthand: top=8px right=0 bottom=24px
      expect(wrapper.html()).toContain('margin: 8px 0px 24px')
    })
  })

  describe('bg class detection', () => {
    it('omits default background-color when a bg- class is present', () => {
      const wrapper = mount(Divider, { attrs: { class: 'bg-red-500' } })
      expect(wrapper.html()).not.toContain('background-color: #cbd5e1')
    })

    it('applies default background-color when no bg- class is present', () => {
      const wrapper = mount(Divider, { attrs: { class: 'text-red-500' } })
      expect(wrapper.html()).toContain('background-color: #cbd5e1')
    })
  })
})

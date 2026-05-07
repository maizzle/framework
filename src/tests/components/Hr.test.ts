import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Hr from '../../components/Hr.vue'

describe('Hr', () => {
  describe('defaults', () => {
    it('renders a div with role="separator"', () => {
      const wrapper = mount(Hr)
      expect(wrapper.html()).toContain('role="separator"')
    })

    it('uses 1px height by default', () => {
      const wrapper = mount(Hr)
      expect(wrapper.html()).toContain('height: 1px')
      expect(wrapper.html()).toContain('line-height: 1px')
    })

    it('uses default background color', () => {
      const wrapper = mount(Hr)
      expect(wrapper.html()).toContain('background-color: #cbd5e1')
    })

    it('applies default spaceY margins', () => {
      const wrapper = mount(Hr)
      // happy-dom collapses margin-top/bottom into shorthand
      expect(wrapper.html()).toContain('margin: 24px 0px')
    })

    it('contains zero-width joiner', () => {
      const wrapper = mount(Hr)
      expect(wrapper.text()).toContain('\u200D')
    })
  })

  describe('height prop', () => {
    it('accepts a string value', () => {
      const wrapper = mount(Hr, { props: { height: '2px' } })
      expect(wrapper.html()).toContain('height: 2px')
      expect(wrapper.html()).toContain('line-height: 2px')
    })

    it('accepts a number and adds px suffix', () => {
      const wrapper = mount(Hr, { props: { height: 3 } })
      expect(wrapper.html()).toContain('height: 3px')
      expect(wrapper.html()).toContain('line-height: 3px')
    })
  })

  describe('spacing props', () => {
    it('spaceY sets top and bottom margins', () => {
      const wrapper = mount(Hr, { props: { spaceY: '16px' } })
      expect(wrapper.html()).toContain('margin: 16px 0px')
    })

    it('spaceY accepts a number', () => {
      const wrapper = mount(Hr, { props: { spaceY: 10 } })
      expect(wrapper.html()).toContain('margin: 10px 0px')
    })

    it('spaceY of 0 outputs 0px', () => {
      const wrapper = mount(Hr, { props: { spaceY: 0 } })
      expect(wrapper.html()).toContain('margin: 0px')
    })

    it('spaceX sets left and right margins', () => {
      const wrapper = mount(Hr, { props: { spaceX: '32px' } })
      // spaceY default (24px) still applies alongside spaceX
      expect(wrapper.html()).toContain('margin: 24px 32px')
    })

    it('spaceX of 0 outputs 0px for horizontal margins', () => {
      const wrapper = mount(Hr, { props: { spaceX: 0 } })
      // spaceY default (24px) still applies
      expect(wrapper.html()).toContain('margin: 24px 0px')
    })
  })

  describe('individual margin props', () => {
    it('top sets margin-top', () => {
      const wrapper = mount(Hr, { props: { top: '8px' } })
      expect(wrapper.html()).toContain('8px')
    })

    it('bottom sets margin-bottom', () => {
      const wrapper = mount(Hr, { props: { bottom: '12px' } })
      expect(wrapper.html()).toContain('12px')
    })

    it('left sets margin-left', () => {
      const wrapper = mount(Hr, { props: { left: '4px' } })
      expect(wrapper.html()).toContain('4px')
    })

    it('right sets margin-right', () => {
      const wrapper = mount(Hr, { props: { right: '4px' } })
      expect(wrapper.html()).toContain('4px')
    })

    it('individual margins accept numbers', () => {
      const wrapper = mount(Hr, { props: { top: 5, bottom: 10 } })
      const html = wrapper.html()
      expect(html).toContain('5px')
      expect(html).toContain('10px')
    })

    it('individual margin overrides spaceY', () => {
      const wrapper = mount(Hr, { props: { spaceY: '24px', top: '8px' } })
      // margin shorthand: top=8px right=0 bottom=24px
      expect(wrapper.html()).toContain('margin: 8px 0px 24px')
    })
  })

  describe('user class and style', () => {
    it('passes through class', () => {
      const wrapper = mount(Hr, { attrs: { class: 'bg-red-500' } })
      expect(wrapper.html()).toContain('class="bg-red-500"')
    })

    it('user inline style overrides the default background color', () => {
      const wrapper = mount(Hr, { attrs: { style: 'background-color: red' } })
      const html = wrapper.html()
      expect(html).toContain('background-color: red')
      expect(html).not.toContain('background-color: #cbd5e1')
    })
  })
})

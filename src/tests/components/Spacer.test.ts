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

  describe('size prop', () => {
    it('sets line-height when provided as string', () => {
      const wrapper = mount(Spacer, { props: { size: '32px' } })
      expect(wrapper.html()).toContain('line-height: 32px')
    })

    it('accepts a number and adds px suffix', () => {
      const wrapper = mount(Spacer, { props: { size: 24 } })
      expect(wrapper.html()).toContain('line-height: 24px')
    })

    it('preserves non-numeric string values', () => {
      const wrapper = mount(Spacer, { props: { size: '2rem' } })
      expect(wrapper.html()).toContain('line-height: 2rem')
    })
  })

  describe('msoHeight prop', () => {
    it('sets mso-line-height-alt', () => {
      const wrapper = mount(Spacer, { props: { size: '32px', msoHeight: '40px' } })
      expect(wrapper.html()).toContain('mso-line-height-alt: 40px')
    })

    it('accepts a number and adds px suffix', () => {
      const wrapper = mount(Spacer, { props: { size: '32px', msoHeight: 48 } })
      expect(wrapper.html()).toContain('mso-line-height-alt: 48px')
    })
  })

  describe('conditional rendering', () => {
    it('renders with style when size is provided', () => {
      const wrapper = mount(Spacer, { props: { size: '16px' } })
      expect(wrapper.html()).toContain('style=')
    })

    it('renders without style when no size is provided', () => {
      const wrapper = mount(Spacer)
      expect(wrapper.html()).not.toContain('style=')
    })
  })
})

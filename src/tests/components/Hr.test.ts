import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Hr from '../../components/Hr.vue'

describe('Hr', () => {
  describe('defaults', () => {
    it('renders a div with role="separator"', () => {
      const wrapper = mount(Hr)
      expect(wrapper.html()).toContain('role="separator"')
    })

    it('applies default Tailwind classes', () => {
      const wrapper = mount(Hr)
      const html = wrapper.html()
      expect(html).toContain('h-px')
      expect(html).toContain('leading-px')
      expect(html).toContain('my-6')
      expect(html).toContain('bg-slate-300')
    })

    it('contains zero-width joiner', () => {
      const wrapper = mount(Hr)
      expect(wrapper.text()).toContain('‍')
    })
  })

  describe('user class overrides', () => {
    it('h-* overrides default height and mirrors line-height', () => {
      const wrapper = mount(Hr, { attrs: { class: 'h-4' } })
      const html = wrapper.html()
      expect(html).toContain('h-4')
      expect(html).toContain('leading-4')
      expect(html).not.toContain('h-px')
      expect(html).not.toContain('leading-px')
    })

    it('mirrors arbitrary height values to line-height', () => {
      const wrapper = mount(Hr, { attrs: { class: 'h-[3px]' } })
      const html = wrapper.html()
      expect(html).toContain('h-[3px]')
      expect(html).toContain('leading-[3px]')
    })

    it('mirrors h-full to leading-full', () => {
      const wrapper = mount(Hr, { attrs: { class: 'h-full' } })
      const html = wrapper.html()
      expect(html).toContain('h-full')
      expect(html).toContain('leading-full')
      expect(html).not.toContain('leading-px')
    })

    it('explicit leading-* wins, no mirroring', () => {
      const wrapper = mount(Hr, { attrs: { class: 'h-4 leading-none' } })
      const html = wrapper.html()
      expect(html).toContain('h-4')
      expect(html).toContain('leading-none')
      expect(html).not.toContain('leading-4')
      expect(html).not.toContain('leading-px')
    })

    it('leading-* alone overrides default line-height', () => {
      const wrapper = mount(Hr, { attrs: { class: 'leading-none' } })
      const html = wrapper.html()
      expect(html).toContain('leading-none')
      expect(html).not.toContain('leading-px')
    })

    it('my-* overrides vertical margin', () => {
      const wrapper = mount(Hr, { attrs: { class: 'my-2' } })
      const html = wrapper.html()
      expect(html).toContain('my-2')
      expect(html).not.toContain('my-6')
    })

    it('mx-* adds horizontal margin', () => {
      const wrapper = mount(Hr, { attrs: { class: 'mx-4' } })
      expect(wrapper.html()).toContain('mx-4')
    })

    it('mt-*/mb-*/ml-*/mr-* apply individually', () => {
      const wrapper = mount(Hr, { attrs: { class: 'mt-2 mb-4 ml-1 mr-3' } })
      const html = wrapper.html()
      expect(html).toContain('mt-2')
      expect(html).toContain('mb-4')
      expect(html).toContain('ml-1')
      expect(html).toContain('mr-3')
    })

    it('bg-* overrides default background', () => {
      const wrapper = mount(Hr, { attrs: { class: 'bg-red-500' } })
      const html = wrapper.html()
      expect(html).toContain('bg-red-500')
      expect(html).not.toContain('bg-slate-300')
    })

    it('inline style passes through', () => {
      const wrapper = mount(Hr, { attrs: { style: 'background-color: red' } })
      expect(wrapper.html()).toContain('background-color: red')
    })
  })
})

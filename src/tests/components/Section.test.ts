import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Section from '../../components/Section.vue'

describe('Section', () => {
  it('renders a div with no inline styles by default', () => {
    const wrapper = mount(Section)
    expect(wrapper.find('div').attributes('style')).toBeUndefined()
  })

  it('applies max-width to div when custom width is set', () => {
    const wrapper = mount(Section, { props: { width: '600px' } })
    expect(wrapper.find('div').attributes('style')).toContain('max-width: 600px')
  })

  it('applies max-width to div when custom width is a number', () => {
    const wrapper = mount(Section, { props: { width: 600 } })
    expect(wrapper.find('div').attributes('style')).toContain('max-width: 600px')
  })

  it('renders slot content', () => {
    const wrapper = mount(Section, { slots: { default: () => 'Hello' } })
    expect(wrapper.text()).toBe('Hello')
  })

  describe('MSO conditional comments', () => {
    it('wraps div with MSO table', () => {
      const html = mount(Section).html()
      expect(html).toContain('<!--[if mso]>')
      expect(html).toContain('<![endif]-->')
    })

    it('renders MSO table with 100% width by default', () => {
      const html = mount(Section).html()
      expect(html).toContain('style="width:100%"')
    })

    it('renders MSO table with custom width', () => {
      const html = mount(Section, { props: { width: '600px' } }).html()
      expect(html).toContain('style="width:600px"')
    })

    it('renders MSO table with role="none" and no align attribute', () => {
      const html = mount(Section).html()
      expect(html).toContain('role="none"')
      expect(html).not.toContain('align="center"')
    })

    it('renders MSO closing tags', () => {
      const html = mount(Section).html()
      expect(html).toContain('<!--[if mso]></td></tr></table><![endif]-->')
    })

    it('passes style attribute to both div and MSO td', () => {
      const html = mount(Section, { attrs: { style: 'background-color: red' } }).html()
      expect(html).toContain('<td style="background-color: red">')
      expect(html).toContain('background-color: red')
      // div should also have the style
      const wrapper = mount(Section, { attrs: { style: 'background-color: red' } })
      expect(wrapper.find('div').attributes('style')).toContain('background-color: red')
    })

    it('passes style to MSO td along with custom width on div', () => {
      const html = mount(Section, { props: { width: '600px' }, attrs: { style: 'padding: 10px' } }).html()
      expect(html).toContain('<td style="padding: 10px">')
      const wrapper = mount(Section, { props: { width: '600px' }, attrs: { style: 'padding: 10px' } })
      const divStyle = wrapper.find('div').attributes('style')
      expect(divStyle).toContain('max-width: 600px')
      expect(divStyle).toContain('padding: 10px')
    })

    it('applies mso-style only to MSO td, not to div', () => {
      const html = mount(Section, { props: { msoStyle: 'padding: 20px' } }).html()
      expect(html).toContain('<td style="padding: 20px">')
      const wrapper = mount(Section, { props: { msoStyle: 'padding: 20px' } })
      expect(wrapper.find('div').attributes('style')).toBeUndefined()
    })

    it('combines style and mso-style on MSO td', () => {
      const html = mount(Section, {
        props: { msoStyle: 'padding: 20px' },
        attrs: { style: 'background-color: red' }
      }).html()
      expect(html).toContain('background-color: red')
      expect(html).toContain('padding: 20px')
    })
  })
})

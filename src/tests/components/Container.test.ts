import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Container from '../../components/Container.vue'

describe('Container', () => {
  it('renders a div with max-width and centered margin', () => {
    const wrapper = mount(Container)
    const style = wrapper.find('div').attributes('style')
    expect(style).toContain('max-width: 37.5em')
    expect(style).toContain('margin: 0px auto')
  })

  it('uses default width of 37.5em', () => {
    const wrapper = mount(Container)
    expect(wrapper.find('div').attributes('style')).toContain('max-width: 37.5em')
  })

  it('accepts custom width as string', () => {
    const wrapper = mount(Container, { props: { width: '600px' } })
    expect(wrapper.find('div').attributes('style')).toContain('max-width: 600px')
  })

  it('accepts custom width as number and adds px', () => {
    const wrapper = mount(Container, { props: { width: 600 } })
    expect(wrapper.find('div').attributes('style')).toContain('max-width: 600px')
  })

  it('renders slot content', () => {
    const wrapper = mount(Container, { slots: { default: () => 'Hello' } })
    expect(wrapper.text()).toBe('Hello')
  })

  describe('MSO conditional comments', () => {
    it('wraps div with MSO table', () => {
      const html = mount(Container).html()
      expect(html).toContain('<!--[if mso]>')
      expect(html).toContain('<![endif]-->')
    })

    it('renders MSO table with matching width', () => {
      const html = mount(Container, { props: { width: '600px' } }).html()
      expect(html).toContain('style="width:600px"')
    })

    it('renders MSO table with role="none" and align="center"', () => {
      const html = mount(Container).html()
      expect(html).toContain('role="none"')
      expect(html).toContain('align="center"')
    })

    it('renders MSO closing tags', () => {
      const html = mount(Container).html()
      expect(html).toContain('<!--[if mso]></td></tr></table><![endif]-->')
    })
  })
})

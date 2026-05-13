import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Container from '../../components/Container.vue'

describe('Container', () => {
  it('applies max-w-150 m-0 mx-auto by default when no width prop is set', () => {
    const wrapper = mount(Container)
    const div = wrapper.find('div')
    expect(div.classes()).toContain('max-w-150')
    expect(div.classes()).toContain('m-0')
    expect(div.classes()).toContain('mx-auto')
    expect(div.attributes('style')).toBeUndefined()
  })

  it('overrides the default width with a user-provided w-* class via twMerge', () => {
    const wrapper = mount(Container, { attrs: { class: 'w-[400px]' } })
    const div = wrapper.find('div')
    expect(div.classes()).toContain('w-[400px]')
    expect(div.classes()).not.toContain('max-w-150')
    expect(div.classes()).toContain('mx-auto')
  })

  it('drops the default max-w-150 when the user passes a max-w-* class', () => {
    const wrapper = mount(Container, { attrs: { class: 'max-w-xl' } })
    const classes = wrapper.find('div').classes()
    expect(classes).toContain('max-w-xl')
    expect(classes).not.toContain('max-w-150')
    expect(classes).toContain('mx-auto')
  })

  it('drops the default max-w-150 when the user passes a min-w-* class', () => {
    const wrapper = mount(Container, { attrs: { class: 'min-w-0' } })
    const classes = wrapper.find('div').classes()
    expect(classes).toContain('min-w-0')
    expect(classes).not.toContain('max-w-150')
  })

  it('drops the default max-w-150 when a width class has a variant prefix', () => {
    const wrapper = mount(Container, { attrs: { class: 'sm:max-w-xl' } })
    const classes = wrapper.find('div').classes()
    expect(classes).toContain('sm:max-w-xl')
    expect(classes).not.toContain('max-w-150')
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

    it('emits an MSO width placeholder when no width prop is set', () => {
      const html = mount(Container).html()
      expect(html).toMatch(/style="width: __MAIZZLE_MSOW_c\d+__"/)
    })

    it('renders MSO table with matching width when prop set', () => {
      const html = mount(Container, { props: { width: '600px' } }).html()
      expect(html).toContain('style="width: 600px"')
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

    it('emits an MSO td-style placeholder in the opening td', () => {
      const html = mount(Container).html()
      expect(html).toMatch(/<td__MAIZZLE_MSOTDSTYLE_ct\d+__>/)
    })

    it('exposes msoStyle on the div via data-maizzle-mso-style', () => {
      const wrapper = mount(Container, { props: { msoStyle: 'padding: 20px' } })
      expect(wrapper.find('div').attributes('data-maizzle-mso-style')).toBe('padding: 20px')
    })

    it('does not write msoStyle into the visible div style', () => {
      const wrapper = mount(Container, { props: { msoStyle: 'padding: 20px' } })
      expect(wrapper.find('div').attributes('style')).toBeUndefined()
    })

    it('emits the td placeholder even when width prop is set', () => {
      const html = mount(Container, { props: { width: '600px' } }).html()
      expect(html).toMatch(/<td__MAIZZLE_MSOTDSTYLE_ct\d+__>/)
    })

    it('exposes data-maizzle-mso-td-id matching the td placeholder id', () => {
      const wrapper = mount(Container)
      const div = wrapper.find('div')
      const tdId = div.attributes('data-maizzle-mso-td-id')
      expect(tdId).toMatch(/^ct\d+$/)
      expect(wrapper.html()).toContain(`__MAIZZLE_MSOTDSTYLE_${tdId}__`)
    })
  })

  describe('outlookFallback=false', () => {
    it('skips MSO comments and width placeholder', () => {
      const html = mount(Container, { props: { outlookFallback: false } }).html()
      expect(html).not.toContain('<!--[if mso]>')
      expect(html).not.toContain('__MAIZZLE_MSOW_')
      expect(html).not.toContain('__MAIZZLE_MSOTDSTYLE_')
    })

    it('omits td placeholder + mso-style data attr when disabled', () => {
      const wrapper = mount(Container, { props: { outlookFallback: false, msoStyle: 'padding: 20px' } })
      expect(wrapper.find('div').attributes('data-maizzle-mso-td-id')).toBeUndefined()
      expect(wrapper.find('div').attributes('data-maizzle-mso-style')).toBeUndefined()
    })

    it('preserves the visible div with default classes', () => {
      const wrapper = mount(Container, { props: { outlookFallback: false } })
      const div = wrapper.find('div')
      expect(div.classes()).toContain('max-w-150')
      expect(div.classes()).toContain('mx-auto')
    })

    it('still applies width prop to the visible div', () => {
      const wrapper = mount(Container, { props: { outlookFallback: false, width: '600px' } })
      expect(wrapper.find('div').attributes('style')).toContain('max-width: 600px')
    })
  })
})

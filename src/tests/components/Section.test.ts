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
    expect(wrapper.find('div').classes()).toContain('max-w-[600px]')
  })

  it('applies max-width to div when custom width is a number', () => {
    const wrapper = mount(Section, { props: { width: 600 } })
    expect(wrapper.find('div').classes()).toContain('max-w-[600px]')
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
      expect(html).toContain('style="width: 100%"')
    })

    it('renders MSO table with custom width', () => {
      const html = mount(Section, { props: { width: '600px' } }).html()
      expect(html).toContain('style="width: 600px"')
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

    it('emits the MSO td-style placeholder for the post-juice transformer', () => {
      const html = mount(Section).html()
      expect(html).toMatch(/<td__MAIZZLE_MSOTDSTYLE_st\d+__>/)
    })

    it('marks the div with data-maizzle-mso-td-id so the transformer can find it', () => {
      const wrapper = mount(Section, { attrs: { style: 'background-color: red' } })
      const div = wrapper.find('div')
      expect(div.attributes('data-maizzle-mso-td-id')).toMatch(/^st\d+$/)
      // div still carries the user style for modern clients; the auto-hoist runs later.
      expect(div.attributes('style')).toContain('background-color: red')
    })

    it('keeps user inline style on the div; div + custom width coexist', () => {
      const wrapper = mount(Section, { props: { width: '600px' }, attrs: { style: 'padding: 10px' } })
      const div = wrapper.find('div')
      expect(div.classes()).toContain('max-w-[600px]')
      expect(div.attributes('style')).toContain('padding: 10px')
    })

    it('passes mso-style through data-maizzle-mso-style, not directly into the td', () => {
      const wrapper = mount(Section, { props: { msoStyle: 'padding: 20px' } })
      const div = wrapper.find('div')
      expect(div.attributes('data-maizzle-mso-style')).toBe('padding: 20px')
      // mso-style stays out of the visible div style.
      expect(div.attributes('style')).toBeUndefined()
    })
  })

  describe('class/inline style width resolution', () => {
    it('emits a width placeholder when a width utility class is passed', () => {
      const html = mount(Section, { attrs: { class: 'max-w-md' } }).html()
      expect(html).toMatch(/style="width: __MAIZZLE_MSOW_s\d+__"/)
    })

    it('emits a width placeholder when an inline style with max-width is passed', () => {
      const html = mount(Section, { attrs: { style: 'max-width: 500px' } }).html()
      expect(html).toMatch(/style="width: __MAIZZLE_MSOW_s\d+__"/)
    })

    it('emits a width placeholder when an inline style with width is passed', () => {
      const html = mount(Section, { attrs: { style: 'width: 480px' } }).html()
      expect(html).toMatch(/style="width: __MAIZZLE_MSOW_s\d+__"/)
    })

    it('attaches data-maizzle-msow-id and 100% fallback on the div when emitting a placeholder', () => {
      const wrapper = mount(Section, { attrs: { class: 'max-w-md' } })
      const div = wrapper.find('div')
      expect(div.attributes('data-maizzle-msow-id')).toMatch(/^s\d+$/)
      expect(div.attributes('data-maizzle-msow-fallback')).toBe('100%')
    })

    it('does not emit a placeholder when no width source is provided', () => {
      const html = mount(Section).html()
      expect(html).toContain('style="width: 100%"')
      expect(html).not.toContain('__MAIZZLE_MSOW_')
      expect(mount(Section).find('div').attributes('data-maizzle-msow-id')).toBeUndefined()
    })

    it('does not emit a placeholder when a non-width class is passed', () => {
      const html = mount(Section, { attrs: { class: 'bg-red-500 p-4' } }).html()
      expect(html).toContain('style="width: 100%"')
      expect(html).not.toContain('__MAIZZLE_MSOW_')
    })

    it('does not emit a placeholder when a non-width inline style is passed', () => {
      const html = mount(Section, { attrs: { style: 'background-color: red' } }).html()
      expect(html).toContain('style="width: 100%"')
      expect(html).not.toContain('__MAIZZLE_MSOW_')
    })

    it('width prop takes precedence over class-derived width', () => {
      const html = mount(Section, {
        props: { width: '600px' },
        attrs: { class: 'max-w-md' }
      }).html()
      expect(html).toContain('style="width: 600px"')
      expect(html).not.toContain('__MAIZZLE_MSOW_')
    })

    it('detects width utilities behind variant prefixes', () => {
      const html = mount(Section, { attrs: { class: 'sm:max-w-xl' } }).html()
      expect(html).toMatch(/style="width: __MAIZZLE_MSOW_s\d+__"/)
    })
  })

  describe('outlookFallback=false', () => {
    it('skips MSO comments and width markers', () => {
      const html = mount(Section, {
        props: { outlookFallback: false },
        attrs: { class: 'max-w-md' },
      }).html()
      expect(html).not.toContain('<!--[if mso]>')
      expect(html).not.toContain('__MAIZZLE_MSOW_')
      expect(html).not.toContain('data-maizzle-msow')
    })
  })
})

import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Row from '../../components/Row.vue'

describe('Row', () => {
  it('renders a div with font-size 0', () => {
    const wrapper = mount(Row)
    const style = wrapper.find('div').attributes('style')
    expect(style).toContain('font-size: 0')
  })

  it('renders slot content', () => {
    const wrapper = mount(Row, { slots: { default: () => 'Columns here' } })
    expect(wrapper.text()).toBe('Columns here')
  })

  describe('MSO conditional comments', () => {
    it('wraps div with MSO table and tr', () => {
      const html = mount(Row).html()
      expect(html).toContain('<!--[if mso]><table role="none" cellpadding="0" cellspacing="0" style="width: 100%"><tr><![endif]-->')
    })

    it('renders MSO closing tags', () => {
      const html = mount(Row).html()
      expect(html).toContain('<!--[if mso]></tr></table><![endif]-->')
    })
  })
})

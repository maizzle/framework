import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Head from '../../components/Head.vue'

describe('Head', () => {
  it('renders a head element', () => {
    const wrapper = mount(Head)
    expect(wrapper.find('head').exists()).toBe(true)
  })

  it('includes charset meta tag', () => {
    const html = mount(Head).html()
    expect(html).toContain('charset="utf-8"')
  })

  it('includes apple disable message reformatting meta tag', () => {
    const html = mount(Head).html()
    expect(html).toContain('name="x-apple-disable-message-reformatting"')
  })

  it('includes viewport meta tag', () => {
    const html = mount(Head).html()
    expect(html).toContain('name="viewport"')
    expect(html).toContain('content="width=device-width, initial-scale=1"')
  })

  it('renders slot content', () => {
    const wrapper = mount(Head, { slots: { default: () => '<title>Test</title>' } })
    expect(wrapper.html()).toContain('Test')
  })
})

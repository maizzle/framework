import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Text from '../../components/Text.vue'

describe('Text', () => {
  it('renders as <p> by default', () => {
    const wrapper = mount(Text, { slots: { default: () => 'hello' } })
    expect(wrapper.element.tagName).toBe('P')
    expect(wrapper.text()).toBe('hello')
  })

  it('renders as <span> when as="span"', () => {
    const wrapper = mount(Text, { props: { as: 'span' }, slots: { default: () => 'inline' } })
    expect(wrapper.element.tagName).toBe('SPAN')
  })

  it('applies mt-4 text-base on the <p> variant', () => {
    const wrapper = mount(Text)
    const classes = wrapper.classes()
    expect(classes).toContain('mt-4')
    expect(classes).toContain('text-base')
  })

  it('adds no font-size/line-height or margin classes on the <span> variant', () => {
    const wrapper = mount(Text, { props: { as: 'span' } })
    expect(wrapper.attributes('class')).toBeUndefined()
  })

  it('twMerges user classes so they can override defaults (e.g. m-0 strips mt-4)', () => {
    const wrapper = mount(Text, { attrs: { class: 'm-0' } })
    const classes = wrapper.classes()
    expect(classes).toContain('m-0')
    expect(classes).not.toContain('mt-4')
    // text-base survives since it's not in the same Tailwind conflict group as m-0.
    expect(classes).toContain('text-base')
  })

  it('user text-* override replaces the default text-base', () => {
    const wrapper = mount(Text, { attrs: { class: 'text-lg' } })
    const classes = wrapper.classes()
    expect(classes).toContain('text-lg')
    expect(classes).not.toContain('text-base')
  })

  it('does not duplicate a user class that twMerge passes through (e.g. yahoo:text-2xl)', () => {
    /**
     * `yahoo:` is not a Tailwind built-in variant so twMerge can't
     * dedupe it against defaults; component must still emit each
     * class once.
     */
    const wrapper = mount(Text, { attrs: { class: 'yahoo:text-2xl' } })
    const classAttr = wrapper.attributes('class') ?? ''
    const occurrences = classAttr.split(/\s+/).filter(c => c === 'yahoo:text-2xl').length
    expect(occurrences).toBe(1)
  })
})

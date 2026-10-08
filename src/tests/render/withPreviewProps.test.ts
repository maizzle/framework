import { describe, it, expect, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { withPreviewProps, PreviewPropsKey } from '../../render/withPreviewProps.ts'
import { MaizzleConfigKey } from '../../composables/useConfig.ts'

const Welcome = defineComponent({
  __name: 'Welcome',
  props: { name: String, plan: String },
  setup(props, { slots }) {
    return () => h('div', [`${props.name} ${props.plan}`, slots.default?.()])
  },
})

function mountWrapped(previewProps: () => Record<string, any>, options: { flagged?: boolean, props?: Record<string, any>, slots?: Record<string, () => any> } = {}) {
  return mount(withPreviewProps(Welcome, previewProps), {
    props: options.props,
    slots: options.slots,
    global: {
      provide: {
        [MaizzleConfigKey as symbol]: options.flagged ? { [PreviewPropsKey]: true } : {},
      },
    },
  })
}

describe('withPreviewProps', () => {
  it('renders preview props when the config is flagged', () => {
    const wrapper = mountWrapped(() => ({ name: 'Ava', plan: 'Pro' }), { flagged: true })
    expect(wrapper.text()).toBe('Ava Pro')
  })

  it('lets real props override preview props', () => {
    const wrapper = mountWrapped(() => ({ name: 'Ava', plan: 'Pro' }), { flagged: true, props: { name: 'Real' } })
    expect(wrapper.text()).toBe('Real Pro')
  })

  it('never calls the factory when the config is not flagged', () => {
    const factory = vi.fn(() => ({ name: 'Ava', plan: 'Pro' }))
    const wrapper = mountWrapped(factory, { props: { name: 'Real', plan: 'Free' } })

    expect(wrapper.text()).toBe('Real Free')
    expect(factory).not.toHaveBeenCalled()
  })

  it('never calls the factory when no config is provided', () => {
    const factory = vi.fn(() => ({ name: 'Ava' }))
    const wrapper = mount(withPreviewProps(Welcome, factory), { props: { name: 'Real', plan: 'Free' } })

    expect(wrapper.text()).toBe('Real Free')
    expect(factory).not.toHaveBeenCalled()
  })

  it('passes slots through to the wrapped component', () => {
    const wrapper = mountWrapped(() => ({ name: 'Ava', plan: 'Pro' }), { flagged: true, slots: { default: () => ' + slot' } })
    expect(wrapper.text()).toBe('Ava Pro + slot')
  })

  it('applies undeclared attributes once, on the wrapped root', () => {
    const wrapper = mountWrapped(() => ({}), { props: { class: 'email' } })
    expect(wrapper.attributes('class')).toBe('email')
    expect(wrapper.html().match(/class=/g)).toHaveLength(1)
  })

  it('keeps the wrapped component name', () => {
    expect((withPreviewProps(Welcome, () => ({})) as { name?: string }).name).toBe('Welcome')
  })
})

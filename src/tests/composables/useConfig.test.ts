import { describe, it, expect } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { useConfig, MaizzleConfigKey } from '../../composables/useConfig.ts'
import type { MaizzleConfig } from '../../types/config.ts'

describe('useConfig', () => {
  it('returns the provided config', () => {
    let result: MaizzleConfig | undefined

    const provided: MaizzleConfig = {
      content: ['emails/**/*.vue'],
      output: { path: 'dist' },
      css: { safe: true },
    }

    const Comp = defineComponent({
      setup() {
        result = useConfig()
        return () => h('div')
      },
    })

    mount(Comp, {
      global: {
        provide: {
          [MaizzleConfigKey as symbol]: provided,
        },
      },
    })

    expect(result).toBe(provided)
  })

  it('returns the same reference as provided', () => {
    let result: MaizzleConfig | undefined

    const provided = { content: ['src/**/*.vue'] } as MaizzleConfig

    const Comp = defineComponent({
      setup() {
        result = useConfig()
        return () => h('div')
      },
    })

    mount(Comp, {
      global: {
        provide: {
          [MaizzleConfigKey as symbol]: provided,
        },
      },
    })

    expect(result).toBe(provided)
    expect(result!.content).toEqual(['src/**/*.vue'])
  })

  it('throws when no config is provided', () => {
    const Comp = defineComponent({
      setup() {
        useConfig()
        return () => h('div')
      },
    })

    expect(() => mount(Comp)).toThrow(
      'useConfig() requires the Maizzle plugin to provide config'
    )
  })

  it('receives config from a parent component', () => {
    let childConfig: MaizzleConfig | undefined

    const provided: MaizzleConfig = {
      output: { path: 'build', extension: 'html' },
      css: { shorthand: true },
    }

    const Child = defineComponent({
      setup() {
        childConfig = useConfig()
        return () => h('span')
      },
    })

    const Parent = defineComponent({
      setup() {
        return () => h(Child)
      },
    })

    mount(Parent, {
      global: {
        provide: {
          [MaizzleConfigKey as symbol]: provided,
        },
      },
    })

    expect(childConfig).toBe(provided)
  })

  it('preserves arbitrary user data on the config', () => {
    let result: MaizzleConfig | undefined

    const provided = {
      company: 'Acme',
      theme: { primary: '#ff0000' },
    } as MaizzleConfig

    const Comp = defineComponent({
      setup() {
        result = useConfig()
        return () => h('div')
      },
    })

    mount(Comp, {
      global: {
        provide: {
          [MaizzleConfigKey as symbol]: provided,
        },
      },
    })

    expect(result!.company).toBe('Acme')
    expect((result as any).theme).toEqual({ primary: '#ff0000' })
  })
})

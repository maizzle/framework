import { describe, it, expect } from 'vitest'
import { defineComponent, h, inject } from 'vue'
import { mount } from '@vue/test-utils'
import { defineConfig } from '../../composables/defineConfig.ts'
import { MaizzleConfigKey } from '../../composables/useConfig.ts'
import { RenderContextKey, type RenderContext } from '../../composables/renderContext.ts'
import type { MaizzleConfig } from '../../types/config.ts'

function createRenderContext(): RenderContext {
  return { doctype: undefined, sfcConfig: undefined, sfcEventHandlers: [] }
}

describe('defineConfig', () => {
  describe('outside Vue (config file usage)', () => {
    it('returns the config as-is (same reference)', () => {
      const input = { content: ['emails/**/*.vue'], output: { path: 'dist' } }
      const result = defineConfig(input)

      expect(result).toBe(input)
    })

    it('returns empty object when called with no args', () => {
      const result = defineConfig()

      expect(result).toEqual({})
    })
  })

  describe('inside Vue SFC', () => {
    it('merges SFC config with injected global config', () => {
      let merged: MaizzleConfig | undefined

      const Comp = defineComponent({
        setup() {
          merged = defineConfig({ css: { sixHex: true } })
          return () => h('div')
        },
      })

      mount(Comp, {
        global: {
          provide: {
            [MaizzleConfigKey as symbol]: {
              content: ['emails/**/*.vue'],
              css: { safe: true },
            } as MaizzleConfig,
            [RenderContextKey as symbol]: createRenderContext(),
          },
        },
      })

      expect(merged).toBeDefined()
      expect(merged!.content).toEqual(['emails/**/*.vue'])
      expect(merged!.css?.sixHex).toBe(true)
      expect(merged!.css?.safe).toBe(true)
    })

    it('SFC values take priority over global config', () => {
      let merged: MaizzleConfig | undefined

      const Comp = defineComponent({
        setup() {
          merged = defineConfig({
            output: { path: 'sfc-output' },
          })
          return () => h('div')
        },
      })

      mount(Comp, {
        global: {
          provide: {
            [MaizzleConfigKey as symbol]: {
              output: { path: 'global-output', extension: 'html' },
            } as MaizzleConfig,
            [RenderContextKey as symbol]: createRenderContext(),
          },
        },
      })

      expect(merged!.output?.path).toBe('sfc-output')
      // Global values preserved for keys not overridden
      expect(merged!.output?.extension).toBe('html')
    })

    it('replaces arrays instead of merging them', () => {
      let merged: MaizzleConfig | undefined

      const Comp = defineComponent({
        setup() {
          merged = defineConfig({
            content: ['sfc/**/*.vue'],
          })
          return () => h('div')
        },
      })

      mount(Comp, {
        global: {
          provide: {
            [MaizzleConfigKey as symbol]: {
              content: ['global/**/*.vue', 'shared/**/*.vue'],
            } as MaizzleConfig,
            [RenderContextKey as symbol]: createRenderContext(),
          },
        },
      })

      // Should replace, not concatenate
      expect(merged!.content).toEqual(['sfc/**/*.vue'])
    })

    it('stores merged config in render context', () => {
      const ctx = createRenderContext()

      expect(ctx.sfcConfig).toBeUndefined()

      const Comp = defineComponent({
        setup() {
          defineConfig({ output: { path: 'stored' } })
          return () => h('div')
        },
      })

      mount(Comp, {
        global: {
          provide: {
            [MaizzleConfigKey as symbol]: {} as MaizzleConfig,
            [RenderContextKey as symbol]: ctx,
          },
        },
      })

      expect(ctx.sfcConfig).toBeDefined()
      expect(ctx.sfcConfig!.output?.path).toBe('stored')
    })

    it('provides merged config to child components', () => {
      let childConfig: MaizzleConfig | undefined

      const Child = defineComponent({
        setup() {
          childConfig = inject(MaizzleConfigKey)
          return () => h('span')
        },
      })

      const Parent = defineComponent({
        setup() {
          defineConfig({
            css: { sixHex: true },
          })
          return () => h(Child)
        },
      })

      mount(Parent, {
        global: {
          provide: {
            [MaizzleConfigKey as symbol]: {
              content: ['emails/**/*.vue'],
            } as MaizzleConfig,
            [RenderContextKey as symbol]: createRenderContext(),
          },
        },
      })

      expect(childConfig).toBeDefined()
      expect(childConfig!.css?.sixHex).toBe(true)
      expect(childConfig!.content).toEqual(['emails/**/*.vue'])
    })

    it('works when no global config is injected', () => {
      let merged: MaizzleConfig | undefined

      const Comp = defineComponent({
        setup() {
          merged = defineConfig({ output: { path: 'no-global' } })
          return () => h('div')
        },
      })

      mount(Comp, {
        global: {
          provide: {
            [RenderContextKey as symbol]: createRenderContext(),
          },
        },
      })

      expect(merged).toBeDefined()
      expect(merged!.output?.path).toBe('no-global')
    })
  })

})

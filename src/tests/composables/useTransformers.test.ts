import { describe, it, expect } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { useTransformers } from '../../composables/useTransformers.ts'
import { MaizzleConfigKey } from '../../composables/useConfig.ts'
import { RenderContextKey, type RenderContext } from '../../composables/renderContext.ts'
import type { MaizzleConfig, TransformerToggles } from '../../types/index.ts'

function run(fn: () => void, ctx?: RenderContext, config?: MaizzleConfig) {
  const Comp = defineComponent({
    setup() {
      fn()
      return () => h('div')
    },
  })
  const provide: Record<symbol, unknown> = {}
  if (ctx) provide[RenderContextKey as symbol] = ctx
  if (config) provide[MaizzleConfigKey as symbol] = config
  mount(Comp, { global: { provide } })
}

describe('useTransformers', () => {
  it('writes the toggle onto sfcConfig, seeding from the global config', () => {
    const ctx: RenderContext = { sfcEventHandlers: [] }
    run(() => useTransformers(false), ctx, { css: { inline: true } })
    expect(ctx.sfcConfig?.useTransformers).toBe(false)
    expect(ctx.sfcConfig?.css).toEqual({ inline: true })
  })

  it('defaults to true when called with no argument', () => {
    const ctx: RenderContext = { sfcEventHandlers: [] }
    run(() => useTransformers(), ctx, {})
    expect(ctx.sfcConfig?.useTransformers).toBe(true)
  })

  it('accepts an object of per-transformer toggles', () => {
    const ctx: RenderContext = { sfcEventHandlers: [] }
    const toggles: TransformerToggles = { inlineCss: false, minify: false }
    run(() => useTransformers(toggles), ctx, {})
    expect(ctx.sfcConfig?.useTransformers).toEqual(toggles)
  })

  it('seeds from an existing sfcConfig over the global config', () => {
    const ctx: RenderContext = { sfcEventHandlers: [], sfcConfig: { css: { inline: false } } }
    run(() => useTransformers(false), ctx, { css: { inline: true } })
    expect(ctx.sfcConfig?.css).toEqual({ inline: false })
    expect(ctx.sfcConfig?.useTransformers).toBe(false)
  })

  it('does nothing when no render context is provided', () => {
    expect(() => run(() => useTransformers(false), undefined, {})).not.toThrow()
  })
})

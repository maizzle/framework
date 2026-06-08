import { describe, it, expect } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { useUrlQuery } from '../../composables/useUrlQuery.ts'
import { RenderContextKey, type RenderContext } from '../../composables/renderContext.ts'

function run(fn: () => void, ctx?: RenderContext) {
  const Comp = defineComponent({
    setup() {
      fn()
      return () => h('div')
    },
  })
  mount(Comp, {
    global: { provide: ctx ? { [RenderContextKey as symbol]: ctx } : {} },
  })
}

describe('useUrlQuery', () => {
  it('stores query params on sfcConfig', () => {
    const ctx: RenderContext = { sfcEventHandlers: [] }
    run(() => useUrlQuery({ utm_source: 'maizzle', utm_campaign: 'newsletter' }), ctx)
    expect(ctx.sfcConfig?.url?.query).toEqual({ utm_source: 'maizzle', utm_campaign: 'newsletter' })
  })

  it('merges with existing sfcConfig instead of clobbering it', () => {
    const ctx: RenderContext = { sfcEventHandlers: [], sfcConfig: { url: { base: 'https://x/' } } }
    run(() => useUrlQuery({ utm_source: 'maizzle' }), ctx)
    expect(ctx.sfcConfig?.url?.query).toEqual({ utm_source: 'maizzle' })
    expect(ctx.sfcConfig?.url?.base).toBe('https://x/')
  })

  it('does nothing when no render context is provided', () => {
    expect(() => run(() => useUrlQuery({ a: '1' }))).not.toThrow()
  })
})

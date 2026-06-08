import { describe, it, expect } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { useBaseUrl } from '../../composables/useBaseUrl.ts'
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

describe('useBaseUrl', () => {
  it('stores a string base url on sfcConfig', () => {
    const ctx: RenderContext = { sfcEventHandlers: [] }
    run(() => useBaseUrl('https://cdn.example.com/'), ctx)
    expect(ctx.sfcConfig?.url?.base).toBe('https://cdn.example.com/')
  })

  it('stores an object form on sfcConfig', () => {
    const ctx: RenderContext = { sfcEventHandlers: [] }
    run(() => useBaseUrl({ url: 'https://cdn.example.com/', tags: ['a'] }), ctx)
    expect(ctx.sfcConfig?.url?.base).toEqual({ url: 'https://cdn.example.com/', tags: ['a'] })
  })

  it('merges with existing sfcConfig instead of clobbering it', () => {
    const ctx: RenderContext = { sfcEventHandlers: [], sfcConfig: { url: { query: { a: '1' } } } }
    run(() => useBaseUrl('https://cdn.example.com/'), ctx)
    expect(ctx.sfcConfig?.url?.base).toBe('https://cdn.example.com/')
    expect(ctx.sfcConfig?.url?.query).toEqual({ a: '1' })
  })

  it('does nothing when no render context is provided', () => {
    expect(() => run(() => useBaseUrl('https://cdn.example.com/'))).not.toThrow()
  })
})

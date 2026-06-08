import { describe, it, expect } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { useEvent } from '../../composables/useEvent.ts'
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

describe('useEvent', () => {
  it('pushes a handler onto sfcEventHandlers', () => {
    const ctx: RenderContext = { sfcEventHandlers: [] }
    const handler = ({ template }: any) => template
    run(() => useEvent('beforeRender', handler), ctx)
    expect(ctx.sfcEventHandlers).toHaveLength(1)
    expect(ctx.sfcEventHandlers[0]).toEqual({ name: 'beforeRender', handler })
  })

  it('preserves registration order across multiple calls', () => {
    const ctx: RenderContext = { sfcEventHandlers: [] }
    run(() => {
      useEvent('beforeRender', () => undefined)
      useEvent('afterRender', () => undefined)
    }, ctx)
    expect(ctx.sfcEventHandlers.map(h => h.name)).toEqual(['beforeRender', 'afterRender'])
  })

  it('does nothing when no render context is provided', () => {
    expect(() => run(() => useEvent('beforeRender', () => undefined))).not.toThrow()
  })
})

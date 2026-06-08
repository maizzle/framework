import { describe, it, expect } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { usePreheader } from '../../composables/usePreheader.ts'
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

describe('usePreheader', () => {
  it('auto-derives filler count to fill the 200-char preview budget', () => {
    const ctx: RenderContext = { sfcEventHandlers: [] }
    run(() => usePreheader('Hello'), ctx)
    expect(ctx.preheader).toEqual({ text: 'Hello', fillerCount: 195 })
  })

  it('honors an explicit spaces override', () => {
    const ctx: RenderContext = { sfcEventHandlers: [] }
    run(() => usePreheader('Hi', { spaces: 2 }), ctx)
    expect(ctx.preheader).toEqual({ text: 'Hi', fillerCount: 2 })
  })

  it('clamps the auto count at 0 for text longer than the budget', () => {
    const ctx: RenderContext = { sfcEventHandlers: [] }
    const long = 'x'.repeat(250)
    run(() => usePreheader(long), ctx)
    expect(ctx.preheader?.fillerCount).toBe(0)
  })

  it('clamps a negative spaces override at 0', () => {
    const ctx: RenderContext = { sfcEventHandlers: [] }
    run(() => usePreheader('Hi', { spaces: -5 }), ctx)
    expect(ctx.preheader?.fillerCount).toBe(0)
  })

  it('does nothing when no render context is provided', () => {
    expect(() => run(() => usePreheader('Hi'))).not.toThrow()
  })
})

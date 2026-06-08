import { describe, it, expect } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { usePlaintext } from '../../composables/usePlaintext.ts'
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

describe('usePlaintext', () => {
  it('enables plaintext with an empty options object by default', () => {
    const ctx: RenderContext = { sfcEventHandlers: [] }
    run(() => usePlaintext(), ctx)
    expect(ctx.plaintext).toEqual({})
  })

  it('stores the provided options', () => {
    const ctx: RenderContext = { sfcEventHandlers: [] }
    const opts = { extension: 'text', options: { ignoreTags: ['br'] } }
    run(() => usePlaintext(opts), ctx)
    expect(ctx.plaintext).toBe(opts)
  })

  it('does nothing when no render context is provided', () => {
    expect(() => run(() => usePlaintext())).not.toThrow()
  })
})

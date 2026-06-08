import { describe, it, expect } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { useDoctype } from '../../composables/useDoctype.ts'
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

describe('useDoctype', () => {
  it('sets the doctype on the render context', () => {
    const ctx: RenderContext = { sfcEventHandlers: [] }
    const dt = '<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">'
    run(() => useDoctype(dt), ctx)
    expect(ctx.doctype).toBe(dt)
  })

  it('does nothing when no render context is provided', () => {
    expect(() => run(() => useDoctype('<!DOCTYPE html>'))).not.toThrow()
  })
})

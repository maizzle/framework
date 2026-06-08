import { describe, it, expect } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'
import { useOutputPath } from '../../composables/useOutputPath.ts'
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

describe('useOutputPath', () => {
  it('sets the output path on the render context', () => {
    const ctx: RenderContext = { sfcEventHandlers: [] }
    run(() => useOutputPath('dist/promos/black-friday.html'), ctx)
    expect(ctx.outputPath).toBe('dist/promos/black-friday.html')
  })

  it('does nothing when no render context is provided', () => {
    expect(() => run(() => useOutputPath('dist/x.html'))).not.toThrow()
  })
})

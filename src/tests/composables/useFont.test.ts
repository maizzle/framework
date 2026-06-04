import { describe, it, expect, vi } from 'vitest'

vi.mock('vue', () => ({
  inject: vi.fn(),
}))

import { inject } from 'vue'
import { useFont } from '../../composables/useFont.ts'
import { RenderContextKey, type RenderContext } from '../../composables/renderContext.ts'

const mockedInject = vi.mocked(inject)

function withCtx(ctx: RenderContext): void {
  mockedInject.mockImplementation((key) => key === RenderContextKey ? ctx : undefined)
}

describe('useFont', () => {
  it('does nothing when no context is present', () => {
    mockedInject.mockReturnValue(undefined)
    expect(() => useFont({ family: 'Roboto' })).not.toThrow()
  })

  it('initializes ctx.fonts when missing', () => {
    const ctx: RenderContext = { sfcEventHandlers: [] }
    withCtx(ctx)
    useFont({ family: 'Roboto' })
    expect(ctx.fonts).toEqual([
      expect.objectContaining({ family: 'Roboto', slug: 'roboto' }),
    ])
  })

  it('dedupes by family', () => {
    const ctx: RenderContext = { sfcEventHandlers: [] }
    withCtx(ctx)
    useFont({ family: 'Roboto', weights: [400] })
    useFont({ family: 'Roboto', weights: [700] })
    expect(ctx.fonts).toHaveLength(1)
    expect(ctx.fonts![0].url).toContain('wght@400')
  })

  it('appends multiple distinct families', () => {
    const ctx: RenderContext = { sfcEventHandlers: [] }
    withCtx(ctx)
    useFont({ family: 'Roboto' })
    useFont({ family: 'Inter' })
    expect(ctx.fonts).toHaveLength(2)
    expect(ctx.fonts!.map(f => f.family)).toEqual(['Roboto', 'Inter'])
  })
})

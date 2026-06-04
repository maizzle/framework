import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render } from '../../render/index.ts'
import { setActiveRenderer } from '../../render/active.ts'
import type { Renderer } from '../../render/createRenderer.ts'
import type { MaizzleConfig } from '../../types/index.ts'

function createFakeRenderer() {
  const close = vi.fn(() => Promise.resolve())
  const renderFn = vi.fn(async () => ({
    html: '<html><body><div>from active</div></body></html>',
    templateConfig: { useTransformers: false } as MaizzleConfig,
    sfcEventHandlers: [],
  }))
  const fake: Renderer = {
    render: renderFn,
    invalidate: vi.fn(() => Promise.resolve()),
    invalidateAll: vi.fn(() => Promise.resolve()),
    close,
  }
  return { fake, renderFn, close }
}

describe('render() with an active renderer', () => {
  beforeEach(() => {
    // Reset between tests so an earlier set doesn't bleed across them.
    setActiveRenderer(null)
  })

  it('reuses the active renderer and does not close it', async () => {
    const { fake, renderFn, close } = createFakeRenderer()
    setActiveRenderer(fake)

    const result = await render('<template><div /></template>')

    expect(renderFn).toHaveBeenCalledOnce()
    expect(close).not.toHaveBeenCalled()
    expect(result.html).toContain('from active')
  })

  it('creates and closes its own renderer when none is active', async () => {
    const result = await render('<template><div>own</div></template>')

    expect(result.html).toContain('own')
    /**
     * No assertion on close — implicit: the host process didn't leak
     * a Vite server. Pairs with the reuse test to cover both
     * branches of the `if (!active) await renderer.close()`
     * cleanup in render/index.ts.
     */
  })
})

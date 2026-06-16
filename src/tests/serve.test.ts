import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import type { ViteDevServer } from 'vite'
import { serve } from '../serve.ts'
import { getActiveRenderer } from '../render/active.ts'
import * as rendererMod from '../render/createRenderer.ts'
import type { Renderer } from '../render/createRenderer.ts'

const realCreateRenderer = rendererMod.createRenderer

describe('serve dev server', () => {
  let tempDir: string
  let server: ViteDevServer | undefined
  const originalCwd = process.cwd()

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'maizzle-serve-'))
    process.chdir(tempDir)
  })

  afterEach(async () => {
    await server?.close()
    server = undefined
    process.chdir(originalCwd)
    rmSync(tempDir, { recursive: true, force: true })
  })

  it('refreshes the active renderer when the config file changes', async () => {
    writeFileSync(join(tempDir, 'maizzle.config.js'), 'export default {}\n')

    server = await serve({ port: 3157, silent: true })

    const before = getActiveRenderer()
    expect(before).toBeTruthy()

    // Drive the watcher's config-change branch directly.
    server.watcher.emit('change', resolve(tempDir, 'maizzle.config.js'))

    await vi.waitFor(() => {
      const after = getActiveRenderer()
      expect(after).toBeTruthy()
      expect(after).not.toBe(before)
    }, { timeout: 15000, interval: 100 })
  }, 30000)

  it('detects a root-level config change when config.root is a subdirectory', async () => {
    writeFileSync(join(tempDir, 'maizzle.config.js'), 'export default {}\n')
    mkdirSync(join(tempDir, 'emails'), { recursive: true })

    server = await serve({ config: { root: 'emails' }, port: 3157, silent: true })

    const before = getActiveRenderer()

    // Config file lives at cwd, not under root — the watcher must still match it.
    server.watcher.emit('change', resolve(tempDir, 'maizzle.config.js'))

    await vi.waitFor(() => {
      expect(getActiveRenderer()).not.toBe(before)
    }, { timeout: 15000, interval: 100 })
  }, 30000)

  it('serializes rapid config changes so no renderer is leaked', async () => {
    writeFileSync(join(tempDir, 'maizzle.config.js'), 'export default {}\n')

    // Wrap createRenderer to record every instance and whether it was closed.
    // The race closes the same (stale) renderer repeatedly and leaks the
    // intermediate ones; serialized reloads close each before the next.
    const created: Renderer[] = []
    const closed = new Set<Renderer>()
    const spy = vi.spyOn(rendererMod, 'createRenderer').mockImplementation(async (opts) => {
      const r = await realCreateRenderer(opts)
      created.push(r)
      const origClose = r.close.bind(r)
      r.close = async () => { closed.add(r); return origClose() }
      return r
    })

    try {
      server = await serve({ port: 3157, silent: true })
      const before = getActiveRenderer()
      expect(before).toBeTruthy()

      const cfg = resolve(tempDir, 'maizzle.config.js')
      server.watcher.emit('change', cfg)
      server.watcher.emit('change', cfg)

      await vi.waitFor(() => {
        expect(getActiveRenderer()).not.toBe(before)
      }, { timeout: 20000, interval: 100 })

      // Let in-flight reloads settle (close() carries a 600ms dts drain).
      await new Promise(r => setTimeout(r, 2000))

      // Every renderer ever created except the current active one must have
      // been closed. A leaked intermediate renderer fails this.
      const active = getActiveRenderer()
      for (const r of created) {
        if (r !== active) expect(closed.has(r)).toBe(true)
      }
    } finally {
      spy.mockRestore()
    }
  }, 40000)

  it('clears the active renderer on close', async () => {
    server = await serve({ port: 3157, silent: true })
    expect(getActiveRenderer()).toBeTruthy()

    await server.close()
    server = undefined

    expect(getActiveRenderer()).toBeNull()
  }, 30000)

  it('emits a template-updated HMR event when a template changes', async () => {
    server = await serve({ port: 3157, silent: true })

    const events: string[] = []
    const origSend = server.ws.send.bind(server.ws)
    server.ws.send = ((payload: any) => {
      if (payload?.type === 'custom') events.push(payload.event)
      return origSend(payload)
    }) as typeof server.ws.send

    server.watcher.emit('change', resolve(tempDir, 'emails/welcome.vue'))

    await vi.waitFor(() => {
      expect(events).toContain('maizzle:template-updated')
    }, { timeout: 15000, interval: 100 })
  }, 30000)

  it('fires beforeRender/afterRender/afterTransform when rendering a template', async () => {
    writeFileSync(join(tempDir, 'maizzle.config.js'), `
      export default {
        beforeRender({ template }) {
          return template.source.replace('Original', 'BeforeRender')
        },
        afterRender({ html }) {
          return html.replace('BeforeRender', 'AfterRender')
        },
        afterTransform({ html }) {
          return html + '<!-- transformed -->'
        },
      }
    `)
    mkdirSync(join(tempDir, 'emails'), { recursive: true })
    writeFileSync(join(tempDir, 'emails/welcome.vue'), '<template><div>Original</div></template>\n')

    server = await serve({ port: 3157, silent: true })

    const res = await fetch('http://localhost:3157/__maizzle/render/emails/welcome')
    const html = await res.text()

    expect(html).toContain('AfterRender')
    expect(html).not.toContain('Original')
    expect(html).toContain('<!-- transformed -->')
  }, 30000)
})

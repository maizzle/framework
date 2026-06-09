import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import type { ViteDevServer } from 'vite'
import { serve } from '../serve.ts'
import { getActiveRenderer } from '../render/active.ts'

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
})

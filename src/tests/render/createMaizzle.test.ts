import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { rmSync } from 'node:fs'
import { createMaizzle } from '../../render/index.ts'
import { createRenderer } from '../../render/createRenderer.ts'
import { createTempProject, writeSfc } from './_helpers.ts'

vi.mock('../../render/createRenderer.ts', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../../render/createRenderer.ts')>()
  return { ...mod, createRenderer: vi.fn(mod.createRenderer) }
})

describe('createMaizzle', () => {
  let tempDir: string
  const originalCwd = process.cwd()

  beforeEach(() => {
    tempDir = createTempProject()
    process.chdir(tempDir)
    vi.mocked(createRenderer).mockClear()
  })

  afterEach(() => {
    process.chdir(originalCwd)
    rmSync(tempDir, { recursive: true, force: true })
  })

  it('reuses one renderer across renders', async () => {
    const maizzle = await createMaizzle({ root: tempDir })
    try {
      const first = await maizzle.render('<template><div>first</div></template>')
      const second = await maizzle.render('<template><div>second</div></template>')

      expect(first.html).toContain('first')
      expect(second.html).toContain('second')
      expect(createRenderer).toHaveBeenCalledOnce()
    } finally {
      await maizzle.close()
    }
  })

  it('merges per-render config over the instance config', async () => {
    const maizzle = await createMaizzle({ root: tempDir, data: { name: 'base', greeting: 'Hi' } })
    try {
      const result = await maizzle.render(
        `<script setup>const { data } = useConfig()</script><template><div>{{ data.greeting }} {{ data.name }}</div></template>`,
        { data: { name: 'call' } },
      )

      expect(result.html).toContain('Hi call')
    } finally {
      await maizzle.close()
    }
  })

  it('runs the full pipeline', async () => {
    const maizzle = await createMaizzle({ root: tempDir, plaintext: true })
    try {
      const result = await maizzle.render('<template><html><body><p>Hello</p></body></html></template>')

      expect(result.html.startsWith('<!DOCTYPE html>')).toBe(true)
      expect(result.plaintext).toContain('Hello')
      expect(result.config.root).toBe(tempDir)
    } finally {
      await maizzle.close()
    }
  })

  it('renders file templates', async () => {
    writeSfc(tempDir, 'emails/welcome.vue', '<template><div>from file</div></template>')
    const maizzle = await createMaizzle({ root: tempDir })
    try {
      const result = await maizzle.render('./emails/welcome.vue')
      expect(result.html).toContain('from file')
    } finally {
      await maizzle.close()
    }
  })

  it('keeps overlapping renders isolated', async () => {
    const maizzle = await createMaizzle({ root: tempDir })
    try {
      const results = await Promise.all(
        Array.from({ length: 10 }, (_, i) => maizzle.render(`<template><div>template-${i}</div></template>`)),
      )
      results.forEach((result, i) => expect(result.html).toContain(`template-${i}`))
    } finally {
      await maizzle.close()
    }
  })

  it('rejects an invalid template', async () => {
    const maizzle = await createMaizzle({ root: tempDir })
    try {
      await expect(maizzle.render(null as any)).rejects.toThrow('received null')
    } finally {
      await maizzle.close()
    }
  })

  it('close shuts down the renderer', async () => {
    const maizzle = await createMaizzle({ root: tempDir })
    const renderer = await vi.mocked(createRenderer).mock.results[0].value
    const close = vi.spyOn(renderer, 'close')

    await maizzle.close()

    expect(close).toHaveBeenCalledOnce()
  })
})

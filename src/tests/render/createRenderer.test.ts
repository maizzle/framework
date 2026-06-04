import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { render } from '../../render/index.ts'
import { createRenderer } from '../../render/createRenderer.ts'
import { resolveConfig } from '../../config/index.ts'
import { createTempProject } from './_helpers.ts'

describe('createRenderer', () => {
  let tempDir: string
  const originalCwd = process.cwd()

  beforeEach(() => {
    tempDir = createTempProject()
    process.chdir(tempDir)
  })

  afterEach(() => {
    process.chdir(originalCwd)
    rmSync(tempDir, { recursive: true, force: true })
  })

  it('invalidate is a no-op for an unknown module path', async () => {
    const renderer = await createRenderer({ root: tempDir })
    try {
      await renderer.render('<template><div>x</div></template>', await resolveConfig({ root: tempDir }))
      await expect(renderer.invalidate('/does/not/exist.vue')).resolves.toBeUndefined()
    } finally {
      await renderer.close()
    }
  })

  it('invalidateAll clears the module graph without error', async () => {
    const renderer = await createRenderer({ root: tempDir })
    try {
      await renderer.render('<template><div>x</div></template>', await resolveConfig({ root: tempDir }))
      await expect(renderer.invalidateAll()).resolves.toBeUndefined()
    } finally {
      await renderer.close()
    }
  })

  it('injects fonts registered via the Font component', async () => {
    const config = await resolveConfig({ root: tempDir })
    const result = await render(
      `<template><html><head><Font family="Roboto" /></head><body><p>Hi</p></body></html></template>`,
      config,
    )
    expect(result.html).toContain('fonts.googleapis.com')
  })

  it('wraps a markdown code fence in a table with shiki highlighting', async () => {
    writeFileSync(join(tempDir, 'page.md'), '# Title\n\n```js\nconst x = 1\n```\n')
    const result = await render(join(tempDir, 'page.md'), { useTransformers: false })
    expect(result.html).toContain('<table class="w-full">')
    expect(result.html).toContain('style="color:')
  })
})

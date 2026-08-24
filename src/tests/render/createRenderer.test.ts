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

  it('keeps MSO conditionals intact when Preheader triggers the teleport DOM round-trip', async () => {
    const config = await resolveConfig({ root: tempDir })
    const result = await render(
      `<template>
        <Html>
          <Head />
          <Body>
            <Preheader>Preview text</Preheader>
            <Outlook><img src="https://example.com/image-a.gif"></Outlook>
            <NotOutlook><img src="https://example.com/image-b.gif"></NotOutlook>
          </Body>
        </Html>
      </template>`,
      config,
    )
    expect(result.html).toContain('<!--[if mso]><img src="https://example.com/image-a.gif"><![endif]-->')
    expect(result.html).toContain('<!--[if !mso]><!--><img src="https://example.com/image-b.gif"')
    expect(result.html).not.toContain('---->')
  })

  it('collects sourceFiles through virtual modules and query variants', async () => {
    /**
     * deep.ts is only reachable through a virtual module, and Styled.vue's
     * <style> block creates a query-variant module node for the same file.
     * Both must survive the module graph traversal.
     */
    writeFileSync(join(tempDir, 'deep.ts'), 'export const token = "tracking-widest"\n')
    writeFileSync(join(tempDir, 'Styled.vue'), '<template><div class="underline">s</div></template>\n<style>.x { color: red }</style>\n')
    writeFileSync(join(tempDir, 'entry.vue'), [
      '<script setup>',
      "  import 'virtual:mz-test'",
      "  import Styled from './Styled.vue'",
      '</script>',
      '<template><Styled /></template>',
    ].join('\n'))

    const config = await resolveConfig({
      root: tempDir,
      vite: {
        plugins: [{
          name: 'mz-test-virtual',
          resolveId(id: string) {
            if (id === 'virtual:mz-test') return '\0virtual:mz-test'
          },
          load(id: string) {
            if (id === '\0virtual:mz-test') return `import '${join(tempDir, 'deep.ts')}'`
          },
        }],
      },
    })

    const renderer = await createRenderer(config)
    try {
      const result = await renderer.render(join(tempDir, 'entry.vue'), config)
      expect(result.sourceFiles).toContain(join(tempDir, 'entry.vue'))
      expect(result.sourceFiles).toContain(join(tempDir, 'Styled.vue'))
      expect(result.sourceFiles).toContain(join(tempDir, 'deep.ts'))
    } finally {
      await renderer.close()
    }
  })

  it('wraps a markdown code fence in a table with shiki highlighting', async () => {
    writeFileSync(join(tempDir, 'page.md'), '# Title\n\n```js\nconst x = 1\n```\n')
    const result = await render(join(tempDir, 'page.md'), { useTransformers: false })
    expect(result.html).toContain('<table class="w-full">')
    expect(result.html).toContain('style="color:')
  })
})

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { rmSync } from 'node:fs'
import { render } from '../../render/index.ts'
import { createTempProject } from './_helpers.ts'
import { findOne, textContent } from 'domutils'
import { parse } from '../../utils/ast/index.ts'

describe('render props', () => {
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

  it('passes props to the template via defineProps', async () => {
    const result = await render(`
      <script setup>
      defineProps(['name'])
      </script>
      <template>
        <div>Hello {{ name }}</div>
      </template>
    `, {
      props: { name: 'Ava' },
    })

    expect(result.html).toContain('Hello Ava')
  })

  it('renders prop values literally in text and attributes', async () => {
    const value = `javascript&colon;alert(1) &amp;copy; &lt;b&gt; <i>raw</i> it's "quoted"`
    const result = await render(`
      <script setup>
      defineProps(['value'])
      </script>
      <template>
        <a :href="value">{{ value }}</a>
      </template>
    `, {
      props: { value },
    })

    const link = findOne(el => el.name === 'a', parse(result.html))
    expect(link?.attribs.href).toBe(value)
    expect(textContent(link!)).toBe(value)
  })

  it('does not leak props into useConfig() or the returned config', async () => {
    const result = await render(`
      <script setup>
      const config = useConfig()
      </script>
      <template>
        <div>{{ config.props === undefined ? 'clean' : 'leaked' }}</div>
      </template>
    `, {
      props: { name: 'Ava' },
    })

    expect(result.html).toContain('clean')
    expect(result.config.props).toBeUndefined()
  })

  it('does not render a declared prop as a fallthrough attribute', async () => {
    const result = await render(`
      <script setup>
      defineProps(['name'])
      </script>
      <template>
        <div>{{ name }}</div>
      </template>
    `, {
      props: { name: 'Ava' },
    })

    expect(result.html).not.toContain('name="Ava"')
  })
})

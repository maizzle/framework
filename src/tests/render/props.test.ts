import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { defineComponent, h, type PropType } from 'vue'
import { rmSync } from 'node:fs'
import { render } from '../../render/index.ts'
import { createTempProject } from './_helpers.ts'

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

  it('passes props to strongly typed component', async () => {
    const component = defineComponent({
      props: {
        title: {
          type: String as PropType<'Mr' | 'Ms' | 'Mx'>,
          required: true,
        },
        name: {
          type: String as PropType<string>,
          required: true,
        },
      },
      setup(props) {
        return () => h('div', `Hello ${props.title} ${props.name}`)
      }
    })

    const result = await render(component, {
      props: { title: 'Mx', name: 'Ava' },
    })

    expect(result.html).toContain('Hello Mx Ava')
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

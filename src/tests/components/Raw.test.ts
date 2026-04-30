import { describe, it, expect } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from '@vue/server-renderer'
import Raw from '../../components/Raw.vue'
import { render } from '../../render/index.ts'

function renderProp(props: Record<string, string> = {}) {
  const app = createSSRApp({
    render: () => h(Raw, props),
  })
  return renderToString(app)
}

describe('Raw component (direct prop)', () => {
  it('emits content verbatim via static vnode', async () => {
    const html = await renderProp({ content: '{{ unsub }}' })
    expect(html).toBe('{{ unsub }}')
  })

  it('emits empty when no content', async () => {
    const html = await renderProp({})
    expect(html).toBe('')
  })

  it('preserves HTML in content', async () => {
    const html = await renderProp({ content: '<a href="x">y</a>' })
    expect(html).toBe('<a href="x">y</a>')
  })
})

describe('Raw plugin extraction (full pipeline)', () => {
  it('preserves Vue mustache syntax in slot', async () => {
    const { html } = await render(`
<template>
  <p>Hello <Raw>{{ unsub }}</Raw></p>
</template>
`)
    expect(html).toContain('Hello {{ unsub }}')
  })

  it('preserves multi-line content with dedent', async () => {
    const { html } = await render(`
<template>
  <Raw>
    {{ name }} signed up on {{ date }}
  </Raw>
</template>
`)
    expect(html).toContain('{{ name }} signed up on {{ date }}')
  })

  it('does not interfere with normal Vue interpolation outside Raw', async () => {
    const { html } = await render(`
<script setup>
const name = 'world'
</script>
<template>
  <p>{{ name }} <Raw>{{ raw }}</Raw></p>
</template>
`)
    expect(html).toContain('world')
    expect(html).toContain('{{ raw }}')
  })
})

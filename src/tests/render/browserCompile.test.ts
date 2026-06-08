import { describe, it, expect } from 'vitest'
import { compileSfcToComponent } from '../../render/compileSfc.ts'
import { ssrRender } from '../../render/ssrRender.ts'
import { MaizzleConfigKey } from '../../composables/useConfig.ts'
import { RenderContextKey } from '../../composables/renderContext.ts'
import { resolveConfigBrowser } from '../../config/browser.ts'

async function renderSfc(src: string, config = {}) {
  const component = await compileSfcToComponent(src)
  const resolved = resolveConfigBrowser(config)
  const out = await ssrRender(component, resolved, { configKey: MaizzleConfigKey, contextKey: RenderContextKey })
  return out.html
}

describe('browser SFC compile', () => {
  it('renders interpolation from script setup props/refs', async () => {
    const src = `
<script setup>
import { ref } from 'vue'
const who = ref('World')
</script>
<template><p>Hello {{ who }}</p></template>
`
    const html = await renderSfc(src)
    expect(html).toContain('Hello World')
  })

  it('auto-imports vue APIs without explicit import', async () => {
    const src = `
<script setup>
const n = computed(() => 1 + 1)
</script>
<template><b>{{ n }}</b></template>
`
    const html = await renderSfc(src)
    expect(html).toContain('<b>2</b>')
  })

  it('resolves a user component registered by name', async () => {
    const Card = await compileSfcToComponent(`
<script setup>
defineProps({ title: String })
</script>
<template><div class="card"><h1>{{ title }}</h1><slot /></div></template>
`, { filename: 'Card.vue' })

    const parent = await compileSfcToComponent(`
<template><Card title="Hi"><em>body</em></Card></template>
`)
    const out = await ssrRender(parent, resolveConfigBrowser({}), {
      configKey: MaizzleConfigKey,
      contextKey: RenderContextKey,
      globalComponents: { Card },
    })
    expect(out.html).toContain('class="card"')
    expect(out.html).toContain('<h1>Hi</h1>')
    expect(out.html).toContain('<em>body</em>')
  })

  it('exposes config via auto-imported useConfig', async () => {
    const src = `
<script setup>
const cfg = useConfig()
</script>
<template><span>{{ cfg.root }}</span></template>
`
    const html = await renderSfc(src, { root: '/here' })
    expect(html).toContain('/here')
  })
})

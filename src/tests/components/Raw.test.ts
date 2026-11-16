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

  it('preserves `>` in ESP expressions (#1963)', async () => {
    const { html } = await render(`
<template>
  <p><Raw>{{ $obj->prop }}</Raw></p>
</template>
`)
    expect(html).toContain('<p>{{ $obj->prop }}</p>')
  })

  it('preserves `>` when passed through the content prop', async () => {
    const { html } = await render(`
<template>
  <p><Raw :content="'{{ $obj->prop }}'" /></p>
</template>
`)
    expect(html).toContain('<p>{{ $obj->prop }}</p>')
  })

  it('preserves `<`, `>`, `&` and quotes verbatim', async () => {
    const { html } = await render(`
<template>
  <p><Raw>{% if a < b && c > d %}"it's"{% endif %} &amp; &nbsp;</Raw></p>
</template>
`)
    expect(html).toContain(`<p>{% if a < b && c > d %}"it's"{% endif %} &amp; &nbsp;</p>`)
  })

  it('preserves unbalanced markup', async () => {
    const { html } = await render(`
<template>
  <div><Raw>{% if vip %}<a href="a">{% else %}<a href="b">{% endif %}VIP</a></Raw></div>
</template>
`)
    expect(html).toContain('<div>{% if vip %}<a href="a">{% else %}<a href="b">{% endif %}VIP</a></div>')
  })

  it('does not process markup inside Raw', async () => {
    const { html } = await render(`
<template>
  <Html>
    <Head><style>.red { color: red }</style></Head>
    <Body>
      <Raw><p class="red">raw</p></Raw>
      <p class="red">processed</p>
    </Body>
  </Html>
</template>
`)
    expect(html).toContain('<p class="red">raw</p>')
    expect(html).toMatch(/<p style="color: red;?">processed<\/p>/)
  })

  it('does not treat `$` sequences in content as replacement patterns', async () => {
    const { html } = await render(`
<template>
  <p><Raw>{{ $' }} $& $1</Raw></p>
</template>
`)
    expect(html).toContain(`<p>{{ $' }} $& $1</p>`)
  })

  it('preserves content when minifying', async () => {
    const { html } = await render(`
<template>
  <p><Raw>{{ $obj->prop }}</Raw></p>
</template>
`, { html: { minify: true } })
    expect(html).toContain('{{ $obj->prop }}')
  })

  it('preserves content when formatting', async () => {
    const { html } = await render(`
<template>
  <div><p>Hi <Raw>{{ $obj->prop }}</Raw>,</p></div>
</template>
`, { html: { format: true } })
    expect(html).toContain('Hi {{ $obj->prop }},')
  })

  it('preserves content with useTransformers: false', async () => {
    const { html } = await render(`
<template>
  <p><Raw>{{ $obj->prop }}</Raw></p>
</template>
`, { useTransformers: false })
    expect(html).toContain('<p>{{ $obj->prop }}</p>')
  })

  it('preserves content when Plaintext/NotPlaintext markers are present', async () => {
    const { html, plaintext } = await render(`
<template>
  <p><Raw>{{ $obj->prop }}</Raw></p>
  <NotPlaintext><p>html only</p></NotPlaintext>
  <Plaintext>text only</Plaintext>
</template>
`, { plaintext: true })
    expect(html).toContain('<p>{{ $obj->prop }}</p>')
    expect(plaintext).toContain('{{ $obj->prop }}')
  })

  it('preserves unbalanced markup inside NotPlaintext, with explicit Plaintext', async () => {
    const { html, plaintext } = await render(`
<template>
  <NotPlaintext><p><Raw>{% if vip %}<a href="a">{% else %}<a href="b">{% endif %}VIP{% if vip %}</a>{% else %}</a>{% endif %}</Raw></p></NotPlaintext>
  <Plaintext><Raw>{% if vip %}VIP: a{% else %}VIP: b{% endif %}</Raw></Plaintext>
</template>
`, { plaintext: true })
    expect(html).toContain('<p>{% if vip %}<a href="a">{% else %}<a href="b">{% endif %}VIP{% if vip %}</a>{% else %}</a>{% endif %}</p>')
    expect(html).not.toContain('VIP: a')
    expect(plaintext).toBe('{% if vip %}VIP: a{% else %}VIP: b{% endif %}')
  })

  it('preserves unbalanced markup when a preheader is present', async () => {
    const { html } = await render(`
<script setup>
usePreheader('Preview text')
</script>
<template>
  <Html><Body>
    <Preheader>Component preview</Preheader>
    <p><Raw>{% if vip %}<a href="a">{% else %}<a href="b">{% endif %}VIP</a></Raw></p>
  </Body></Html>
</template>
`)
    expect(html).toContain('<p>{% if vip %}<a href="a">{% else %}<a href="b">{% endif %}VIP</a></p>')
    expect(html).toContain('Preview text')
    expect(html).toContain('Component preview')
    expect(html).not.toContain('__MZ')
  })

  it('preserves content in plaintext output', async () => {
    const { plaintext } = await render(`
<template>
  <p><Raw>{{ $obj->prop }}</Raw></p>
</template>
`, { plaintext: true })
    expect(plaintext).toContain('{{ $obj->prop }}')
  })

  it('preserves content inside Outlook conditionals', async () => {
    const { html } = await render(`
<template>
  <Outlook><p><Raw>{{ $obj->prop }}</Raw></p></Outlook>
</template>
`)
    expect(html).toContain('<p>{{ $obj->prop }}</p>')
  })

  it('does not leak markers into the output', async () => {
    const { html } = await render(`
<template>
  <p><Raw>{{ a }}</Raw> <Raw>{{ b }}</Raw></p>
</template>
`)
    expect(html).toContain('<p>{{ a }} {{ b }}</p>')
    expect(html).not.toContain('MZRAW')
  })

  it('does not restore forged markers from regular content', async () => {
    const { html } = await render(`
<script setup>
const forged = '__MZRAW_0__'
</script>
<template>
  <p><Raw>{{ secret }}</Raw></p>
  <a :href="forged">{{ forged }}</a>
</template>
`)
    expect(html).toContain('<a href="__MZRAW_0__">__MZRAW_0__</a>')
    expect(html.match(/\{\{ secret \}\}/g)).toHaveLength(1)
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

describe('Raw content isolation', () => {
  it('does not mix up content between concurrent renders', async () => {
    const { createMaizzle } = await import('../../render/index.ts')
    const maizzle = await createMaizzle()

    try {
      const results = await Promise.all(
        Array.from({ length: 5 }, (_, i) => maizzle.render(`
<template>
  <p><Raw>{{ $user${i}->name }}</Raw></p>
</template>
`)),
      )

      results.forEach(({ html }, i) => {
        expect(html).toContain(`<p>{{ $user${i}->name }}</p>`)
      })
    } finally {
      await maizzle.close()
    }
  })
})

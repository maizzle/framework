import { describe, it, expect } from 'vitest'
import { createSSRApp, h, Suspense } from 'vue'
import { renderToString } from '@vue/server-renderer'
import CodeBlock from '../../components/CodeBlock.vue'

function render(props: Record<string, string> = {}, slotContent?: string) {
  const app = createSSRApp({
    render: () => h(Suspense, null, {
      default: () => h(CodeBlock, props, slotContent
        ? { default: () => slotContent }
        : undefined
      ),
    }),
  })

  return renderToString(app)
}

describe('CodeBlock', () => {
  describe('syntax highlighting', () => {
    it('highlights HTML code with default settings', async () => {
      const html = await render({ code: '<div>hello</div>' })

      expect(html).toContain('<code>')
      expect(html).toContain('style="color:')
    })

    it('highlights CSS code', async () => {
      const html = await render({ code: '.button { color: red; }', language: 'css' })

      expect(html).toContain('<code>')
      expect(html).toContain('style="color:')
    })

    it('highlights JavaScript code', async () => {
      const html = await render({ code: 'const x = 42', language: 'javascript' })

      expect(html).toContain('<code>')
      expect(html).toContain('style="color:')
    })
  })

  describe('structure', () => {
    it('wraps in table > tr > td > pre > code', async () => {
      const html = await render({ code: '<div>test</div>' })

      expect(html).toMatch(/<table[^>]*>.*<tr>.*<td[^>]*>.*<pre[^>]*>.*<code>.*<\/code>.*<\/pre>.*<\/td>.*<\/tr>.*<\/table>/s)
    })

    it('adds w-full class to the wrapping table', async () => {
      const html = await render({ code: '<div>test</div>' })

      expect(html).toContain('<table class="w-full">')
    })

    it('adds font-mono class to the pre element', async () => {
      const html = await render({ code: '<div>test</div>' })

      expect(html).toMatch(/<pre class="font-mono"/)
    })

    it('sets inline styles on the pre element', async () => {
      const html = await render({ code: '<div>test</div>' })

      expect(html).toContain('background-color:#fff')
      expect(html).toContain('padding:16px')
      expect(html).toContain('overflow:auto')
      expect(html).toContain('white-space:pre')
      expect(html).toContain('word-wrap:normal')
      expect(html).toContain('word-break:normal')
      expect(html).toContain('word-spacing:normal')
    })

    it('uses default td-class', async () => {
      const html = await render({ code: '<div>test</div>' })

      expect(html).toContain('<td class="max-w-0 mso-padding-alt-4"')
    })

    it('accepts custom td-class', async () => {
      const html = await render({ code: '<div>test</div>', 'td-class': 'custom-class' })

      expect(html).toContain('<td class="custom-class"')
    })

    it('sets the shiki theme background on the wrapping td', async () => {
      const html = await render({ code: '<div>test</div>' })

      // github-light bg is #fff — must appear on the td so Outlook's td
      // padding doesn't show through as white on a dark theme.
      expect(html).toMatch(/<td[^>]*style="background-color:#fff"/)
    })

    it('uses the dark theme bg on the wrapping td', async () => {
      const html = await render({ code: '<div>test</div>', theme: 'github-dark' })

      expect(html).toMatch(/<td[^>]*style="background-color:#24292e"/)
    })
  })

  describe('attrs forwarding', () => {
    it('merges class onto the pre element', async () => {
      const html = await render({ code: '<div>test</div>', class: 'p-6 rounded-lg' })

      expect(html).toMatch(/<pre class="font-mono p-6 rounded-lg"/)
    })

    it('merges style onto the pre element', async () => {
      const html = await render({ code: '<div>test</div>', style: 'border:1px solid red' })

      expect(html).toContain('border:1px solid red')
    })
  })

  describe('themes', () => {
    it('uses github-light theme by default', async () => {
      const html = await render({ code: '.foo { color: red; }', language: 'css' })

      expect(html).toContain('background-color:#fff')
    })

    it('supports dark themes', async () => {
      const html = await render({ code: '.foo { color: red; }', language: 'css', theme: 'github-dark' })

      expect(html).toContain('background-color:#24292e')
    })
  })

  describe('empty content', () => {
    it('renders nothing when code is empty', async () => {
      const html = await render({ code: '' })

      expect(html).not.toContain('<code>')
    })

    it('renders nothing when code is only whitespace', async () => {
      const html = await render({ code: '   \n  ' })

      expect(html).not.toContain('<code>')
    })
  })
})

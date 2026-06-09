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

    it('reads code from slot text when no code prop is set', async () => {
      const html = await render({}, 'const x = 42')

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

      expect(html).toMatch(/<pre class="[^"]*\bfont-mono\b/)
    })

    it('emits base styling on the pre element as classes', async () => {
      const html = await render({ code: '<div>test</div>' })

      expect(html).toMatch(/<pre class="[^"]*\bbg-\[#fff\]/)
      expect(html).toMatch(/<pre class="[^"]*\bp-4\b/)
      expect(html).toMatch(/<pre class="[^"]*\bm-0\b/)
      expect(html).toMatch(/<pre class="[^"]*\boverflow-auto\b/)
      expect(html).toMatch(/<pre class="[^"]*whitespace-pre!/)
      expect(html).toMatch(/<pre class="[^"]*\[word-wrap:normal\]/)
      expect(html).toMatch(/<pre class="[^"]*\[word-break:normal\]/)
      expect(html).toMatch(/<pre class="[^"]*\[word-spacing:normal\]/)
    })

    it('marks the pre with data-juice-important so the inliner keeps !important', async () => {
      const html = await render({ code: '<div>test</div>' })

      expect(html).toMatch(/<pre[^>]*\bdata-juice-important\b/)
    })

    it('uses default td-class with the theme bg merged in', async () => {
      const html = await render({ code: '<div>test</div>' })

      expect(html).toMatch(/<td class="[^"]*\bmax-w-0\b/)
      expect(html).toMatch(/<td class="[^"]*\bmso-padding-alt-4\b/)
      expect(html).toMatch(/<td class="[^"]*\bbg-\[#fff\]/)
    })

    it('accepts custom td-class merged with the theme bg', async () => {
      const html = await render({ code: '<div>test</div>', 'td-class': 'custom-class' })

      expect(html).toMatch(/<td class="[^"]*\bcustom-class\b/)
      expect(html).toMatch(/<td class="[^"]*\bbg-\[#fff\]/)
    })

    it('sets the shiki theme background on the wrapping td as a class', async () => {
      const html = await render({ code: '<div>test</div>' })

      /**
       * github-light bg is #fff — must appear on the td so Outlook's
       * td padding doesn't show through as white on a dark theme.
       * Now emitted as a class so user `td-class` overrides via twMerge.
       */
      expect(html).toMatch(/<td[^>]*class="[^"]*\bbg-\[#fff\]/)
    })

    it('uses the dark theme bg on the wrapping td as a class', async () => {
      const html = await render({ code: '<div>test</div>', theme: 'github-dark' })

      expect(html).toMatch(/<td[^>]*class="[^"]*\bbg-\[#24292e\]/)
    })
  })

  describe('attrs forwarding', () => {
    it('merges class onto the pre element', async () => {
      const html = await render({ code: '<div>test</div>', class: 'p-6 rounded-lg' })

      expect(html).toMatch(/<pre class="[^"]*\bfont-mono\b/)
      expect(html).toMatch(/<pre class="[^"]*\bp-6\b/)
      expect(html).toMatch(/<pre class="[^"]*\brounded-lg\b/)
      // User padding wins via twMerge — base p-4 dropped
      expect(html).not.toMatch(/<pre class="[^"]*\bp-4\b/)
    })

    it('merges style onto the pre element', async () => {
      const html = await render({ code: '<div>test</div>', style: 'border:1px solid red' })

      expect(html).toContain('border:1px solid red')
    })
  })

  describe('themes', () => {
    it('uses github-light theme by default', async () => {
      const html = await render({ code: '.foo { color: red; }', language: 'css' })

      expect(html).toContain('bg-[#fff]')
    })

    it('supports dark themes', async () => {
      const html = await render({ code: '.foo { color: red; }', language: 'css', theme: 'github-dark' })

      expect(html).toContain('bg-[#24292e]')
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

    it('ignores slot vnodes whose children are not plain text', async () => {
      // Element child (non-string children) contributes no source.
      const html = await render({}, h('span', null, [h('b', null, 'x')]) as any)

      expect(html).not.toContain('<code>')
    })
  })
})

import { describe, it, expect } from 'vitest'
import { createSSRApp, h, Suspense } from 'vue'
import { renderToString } from '@vue/server-renderer'
import CodeInline from '../../components/CodeInline.vue'

function render(props: Record<string, string> = {}, slotContent?: string) {
  const app = createSSRApp({
    render: () => h(Suspense, null, {
      default: () => h(CodeInline, props, slotContent
        ? { default: () => slotContent }
        : undefined
      ),
    }),
  })

  return renderToString(app)
}

describe('CodeInline', () => {
  describe('rendering', () => {
    it('renders code from prop', async () => {
      const html = await render({ code: 'npm install' })

      expect(html).toContain('<code')
      expect(html).toContain('npm install')
    })

    it('renders code from slot', async () => {
      const html = await render({}, 'npm install')

      expect(html).toContain('npm install')
    })

    it('prefers code prop over slot', async () => {
      const html = await render({ code: 'from prop' }, 'from slot')

      expect(html).toContain('from prop')
      expect(html).not.toContain('from slot')
    })

    it('renders nothing when empty', async () => {
      const html = await render({ code: '' })

      expect(html).not.toContain('<code')
    })
  })

  describe('escaping', () => {
    it('escapes HTML entities', async () => {
      const html = await render({ code: '<div class="foo">' })

      expect(html).toContain('&lt;div class=&quot;foo&quot;&gt;')
      expect(html).not.toContain('<div class="foo">')
    })

    it('escapes ampersands', async () => {
      const html = await render({ code: 'a && b' })

      expect(html).toContain('a &amp;&amp; b')
    })
  })

  describe('styles', () => {
    it('applies default inline styles', async () => {
      const html = await render({ code: 'test' })

      expect(html).toContain('white-space:normal')
      expect(html).toContain('border-radius:6px')
      expect(html).toContain('border:1px solid #d1d5db')
      expect(html).toContain('background-color:#f3f4f6')
      expect(html).toContain('padding:2px 6px')
      expect(html).toContain('font-size:11px')
      expect(html).toContain('color:inherit')
    })

    it('merges custom style', async () => {
      const html = await render({ code: 'test', style: 'font-weight:bold' })

      expect(html).toContain('font-weight:bold')
      expect(html).toContain('white-space:normal')
    })
  })

  describe('attrs forwarding', () => {
    it('merges class onto the code element', async () => {
      const html = await render({ code: 'test', class: 'font-mono' })

      expect(html).toContain('class="font-mono"')
    })
  })
})

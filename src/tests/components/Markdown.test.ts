import { describe, it, expect } from 'vitest'
import { createSSRApp, h, Suspense } from 'vue'
import { renderToString } from '@vue/server-renderer'
import Markdown from '../../components/Markdown.vue'

function render(props: Record<string, any> = {}, slotContent?: string) {
  const app = createSSRApp({
    render: () => h(Suspense, null, {
      default: () => h(Markdown, props, slotContent
        ? { default: () => slotContent }
        : undefined
      ),
    }),
  })

  return renderToString(app)
}

describe('Markdown', () => {
  describe('rendering', () => {
    it('renders markdown from content prop', async () => {
      const html = await render({ content: '# Hello' })

      expect(html).toContain('<h1>Hello</h1>')
    })

    it('renders markdown from slot content', async () => {
      const html = await render({}, '**bold text**')

      expect(html).toContain('<strong>bold text</strong>')
    })

    it('renders paragraphs', async () => {
      const html = await render({ content: 'Hello world' })

      expect(html).toContain('<p>Hello world</p>')
    })

    it('renders links', async () => {
      const html = await render({ content: '[Maizzle](https://maizzle.com)' })

      expect(html).toContain('<a href="https://maizzle.com">Maizzle</a>')
    })

    it('renders lists', async () => {
      const html = await render({ content: '- item 1\n- item 2' })

      expect(html).toContain('<ul>')
      expect(html).toContain('<li>item 1</li>')
      expect(html).toContain('<li>item 2</li>')
    })

    it('renders inline HTML', async () => {
      const html = await render({ content: '<div class="test">content</div>' })

      expect(html).toContain('<div class="test">content</div>')
    })
  })

  describe('code highlighting', () => {
    it('highlights fenced code blocks', async () => {
      const html = await render({ content: '```js\nconst x = 1\n```' })

      expect(html).toContain('<pre')
      expect(html).toContain('<code')
    })

    it('uses github-dark-high-contrast theme by default', async () => {
      const html = await render({ content: '```css\n.foo { color: red; }\n```' })

      expect(html).toContain('background-color:#0a0c10')
    })

    it('supports custom shiki theme', async () => {
      const html = await render({ content: '```css\n.foo { color: red; }\n```', 'shiki-theme': 'github-light' })

      expect(html).toContain('background-color:#fff')
    })
  })

  describe('wrapper', () => {
    it('wraps output in a div by default', async () => {
      const html = await render({ content: 'Hello' })

      expect(html).toMatch(/^<div><p>Hello<\/p>\n<\/div>$/)
    })

    it('does not wrap when wrapper is false', async () => {
      const html = await render({ content: 'Hello', wrapper: false })

      expect(html).not.toMatch(/^<div>/)
      expect(html).toContain('<p>Hello</p>')
    })

    it('forwards class to wrapper div', async () => {
      const html = await render({ content: 'Hello', class: 'prose' })

      expect(html).toMatch(/^<div class="prose">/)
    })

    it('forwards style to wrapper div', async () => {
      const html = await render({ content: 'Hello', style: 'color: red' })

      expect(html).toMatch(/^<div style="color: red">/)
    })
  })

  describe('empty content', () => {
    it('renders nothing when content is empty', async () => {
      const html = await render({ content: '' })

      expect(html).toBe('')
    })

    it('renders nothing when content is only whitespace', async () => {
      const html = await render({ content: '   \n  ' })

      expect(html).toBe('')
    })
  })

  describe('content prop priority', () => {
    it('prefers content prop over slot', async () => {
      const html = await render({ content: '# From prop' }, '# From slot')

      expect(html).toContain('From prop')
      expect(html).not.toContain('From slot')
    })
  })

  describe('dedenting', () => {
    it('handles indented content correctly', async () => {
      const html = await render({ content: '    # Indented\n    Paragraph' })

      expect(html).toContain('<code>')
    })
  })
})

import { describe, it, expect } from 'vitest'
import { createSSRApp, h, Suspense } from 'vue'
import { renderToString } from '@vue/server-renderer'
import Markdown from '../../components/Markdown.vue'
import { MaizzleConfigKey } from '../../composables/useConfig.ts'

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

function renderWithConfig(props: Record<string, any>, markdown: Record<string, any>, slotContent?: string) {
  const app = createSSRApp({
    render: () => h(Suspense, null, {
      default: () => h(Markdown, props, slotContent
        ? { default: () => slotContent }
        : undefined
      ),
    }),
  })

  app.provide(MaizzleConfigKey, { markdown } as any)

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

    it('ignores slot vnodes whose children are not plain text', async () => {
      // Element child (non-string children) contributes no source.
      const html = await render({}, h('span', null, [h('b', null, 'x')]) as any)

      expect(html).toBe('')
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

      expect(html).toContain('bg-[#0a0c10]')
    })

    it('supports custom shiki theme', async () => {
      const html = await render({ content: '```css\n.foo { color: red; }\n```', 'shiki-theme': 'github-light' })

      expect(html).toContain('bg-[#fff]')
    })

    it('falls back gracefully when the fence language is unknown', async () => {
      const html = await render({ content: '```notalang\nplain text\n```' })

      // codeToHtml throws on an unknown language; highlight catches and
      // returns '', so the block still renders (wrapped) with its text.
      expect(html).toContain('plain text')
      expect(html).toContain('<table class="w-full">')
    })

    it('does not pull the wrapper background from the code body', async () => {
      // Unknown languages skip Shiki and hit the plain <pre><code> path. A
      // background-color in the snippet must not become the wrapper color —
      // it should fall back to white.
      const html = await render({ content: '```notalang\n.box { background-color: #f00 }\n```' })

      expect(html).toContain('bg-[#fff]')
      expect(html).not.toContain('bg-[#f00]')
    })
  })

  describe('wrapper', () => {
    it('does not wrap output in a div by default', async () => {
      const html = await render({ content: 'Hello' })

      expect(html).not.toMatch(/^<div>/)
      expect(html).toContain('<p>Hello</p>')
    })

    it('wraps output in a div when wrapper is true', async () => {
      const html = await render({ content: 'Hello', wrapper: true })

      expect(html).toMatch(/^<div><p>Hello<\/p>\n<\/div>$/)
    })

    it('forwards class to wrapper div', async () => {
      const html = await render({ content: 'Hello', wrapper: true, class: 'prose' })

      expect(html).toMatch(/^<div class="prose">/)
    })

    it('forwards style to wrapper div', async () => {
      const html = await render({ content: 'Hello', wrapper: true, style: 'color: red' })

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

  describe('config.markdown integration', () => {
    it('applies markdownOptions from config', async () => {
      const html = await renderWithConfig(
        { content: '<span>raw</span>' },
        { markdownOptions: { html: false } },
      )

      expect(html).toContain('&lt;span&gt;raw&lt;/span&gt;')
    })

    it('lets the config prop override config.markdown.markdownOptions', async () => {
      const html = await renderWithConfig(
        { content: '<span>raw</span>', config: { html: true } },
        { markdownOptions: { html: false } },
      )

      expect(html).toContain('<span>raw</span>')
    })

    it('registers array-form plugins ([plugin, options]) from markdownUses', async () => {
      const suffixer = (md: any, opts: any) => {
        md.core.ruler.push('suffixer', (state: any) => {
          for (const token of state.tokens) {
            if (token.type === 'inline' && token.children) {
              for (const child of token.children) {
                if (child.type === 'text') child.content += opts.suffix
              }
            }
          }
        })
      }

      const html = await renderWithConfig(
        { content: 'hi' },
        { markdownUses: [[suffixer, { suffix: '!' }]] },
      )

      expect(html).toContain('<p>hi!</p>')
    })

    it('registers plugins from markdownUses', async () => {
      const upcase = (md: any) => {
        md.core.ruler.push('upcase', (state: any) => {
          for (const token of state.tokens) {
            if (token.type === 'inline' && token.children) {
              for (const child of token.children) {
                if (child.type === 'text') child.content = child.content.toUpperCase()
              }
            }
          }
        })
      }

      const html = await renderWithConfig({ content: 'hello world' }, { markdownUses: [upcase] })

      expect(html).toContain('<p>HELLO WORLD</p>')
    })

    it('uses shikiTheme from config', async () => {
      const html = await renderWithConfig(
        { content: '```css\n.foo { color: red; }\n```' },
        { shikiTheme: 'github-light' },
      )

      expect(html).toContain('bg-[#fff]')
    })

    it('lets the shikiTheme prop override config', async () => {
      const html = await renderWithConfig(
        { content: '```css\n.foo { color: red; }\n```', 'shiki-theme': 'github-dark-high-contrast' },
        { shikiTheme: 'github-light' },
      )

      expect(html).toContain('bg-[#0a0c10]')
    })
  })
})

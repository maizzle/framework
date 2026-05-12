import { describe, it, expect } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from '@vue/server-renderer'
import Preheader from '../../components/Preheader.vue'

function render(slot?: unknown, props: Record<string, unknown> = {}) {
  const app = createSSRApp({
    render: () => h(Preheader, props, slot ? { default: () => slot } : undefined),
  })

  const ctx: Record<string, any> = {}
  return renderToString(app, ctx).then(() => {
    const teleported = Object.values(ctx.teleports ?? {}).join('')
    return teleported
  })
}

// Each filler iteration emits: U+2007 (figure space) U+FEFF (ZWNBSP) U+034F (combining grapheme joiner) U+0020 (space).
const FILLER_RE = new RegExp('\\u2007\\uFEFF\\u034F\\u0020', 'g')

describe('Preheader', () => {
  describe('structure', () => {
    it('renders a hidden div', async () => {
      const html = await render()
      expect(html).toContain('display:none')
    })

    it('ends with a non-breaking space before closing div', async () => {
      const html = await render()
      expect(html).toContain('\u00A0</div>')
    })
  })

  describe('slot content', () => {
    it('renders slot content as preview text', async () => {
      const html = await render('Hello preview!')
      expect(html).toContain('Hello preview!')
    })

    it('escapes HTML in the slot — markup is rendered as text', async () => {
      const html = await render('Hi <strong>You</strong>')
      expect(html).toContain('Hi &lt;strong&gt;You&lt;/strong&gt;')
      expect(html).not.toContain('<strong>You</strong>')
    })

    it('escapes nested element children to text', async () => {
      const html = await render(h('strong', null, 'Bold text'))
      expect(html).toContain('Bold text')
      expect(html).not.toContain('<strong>')
    })
  })

  describe('filler count', () => {
    it('pads to 200 chars when slot is empty', async () => {
      const html = await render()
      expect((html.match(FILLER_RE) || []).length).toBe(200)
    })

    it('subtracts slot text length from 200', async () => {
      const html = await render('Hello') // 5 chars
      expect((html.match(FILLER_RE) || []).length).toBe(195)
    })

    it('counts text content of nested nodes when computing fillers', async () => {
      const html = await render(h('strong', null, 'Hello')) // 5 visible chars
      expect((html.match(FILLER_RE) || []).length).toBe(195)
    })

    it('renders no fillers when slot text reaches 200 chars', async () => {
      const html = await render('a'.repeat(200))
      expect(FILLER_RE.test(html)).toBe(false)
    })

    it('renders no fillers when slot text exceeds 200 chars', async () => {
      const html = await render('a'.repeat(250))
      expect(FILLER_RE.test(html)).toBe(false)
    })
  })

  describe('spaces prop', () => {
    it('uses the explicit count when spaces prop is set', async () => {
      const html = await render('Hello', { spaces: 5 })
      expect((html.match(FILLER_RE) || []).length).toBe(5)
    })

    it('overrides the auto calculation', async () => {
      // Auto would be 200; explicit 50 wins.
      const html = await render(undefined, { spaces: 50 })
      expect((html.match(FILLER_RE) || []).length).toBe(50)
    })

    it('renders nothing when spaces is 0', async () => {
      const html = await render('Hello', { spaces: 0 })
      expect(FILLER_RE.test(html)).toBe(false)
    })

    it('clamps negative values to 0', async () => {
      const html = await render('Hello', { spaces: -10 })
      expect(FILLER_RE.test(html)).toBe(false)
    })
  })
})

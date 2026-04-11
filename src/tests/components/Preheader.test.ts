import { describe, it, expect } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from '@vue/server-renderer'
import Preheader from '../../components/Preheader.vue'

function render(props: Record<string, any> = {}, slotContent?: string) {
  const app = createSSRApp({
    render: () => h(Preheader, props, slotContent
      ? { default: () => slotContent }
      : undefined
    ),
  })

  const ctx: Record<string, any> = {}
  return renderToString(app, ctx).then(() => {
    // Teleported content is in ctx.teleports keyed by target selector
    const teleported = Object.values(ctx.teleports ?? {}).join('')
    return teleported
  })
}

describe('Preheader', () => {
  describe('structure', () => {
    it('renders a hidden div', async () => {
      const html = await render()

      expect(html).toContain('display:none')
    })
  })

  describe('slot content', () => {
    it('renders slot content as preview text', async () => {
      const html = await render({}, 'Hello preview!')

      expect(html).toContain('Hello preview!')
    })
  })

  describe('filler entities', () => {
    it('renders 150 filler pairs by default', async () => {
      const html = await render()

      const fillerCount = (html.match(/\u2007\u034F/g) || []).length
      expect(fillerCount).toBe(150)
    })

    it('accepts custom filler count', async () => {
      const html = await render({ fillerCount: 5 })

      const fillerCount = (html.match(/\u2007\u034F/g) || []).length
      expect(fillerCount).toBe(5)
    })

    it('renders zero fillers when set to 0', async () => {
      const html = await render({ fillerCount: 0 })

      expect(html).not.toContain('\u2007\u034F')
    })
  })

  describe('shy entities', () => {
    it('renders 150 shy entities by default', async () => {
      const html = await render()

      const shyCount = (html.match(/\u00AD/g) || []).length
      expect(shyCount).toBe(150)
    })

    it('accepts custom shy count', async () => {
      const html = await render({ shyCount: 3 })

      const shyCount = (html.match(/\u00AD/g) || []).length
      expect(shyCount).toBe(3)
    })
  })

  describe('nbsp', () => {
    it('ends with a non-breaking space before closing div', async () => {
      const html = await render()

      expect(html).toContain('\u00A0</div>')
    })
  })
})

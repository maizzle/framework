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

  describe('spaces', () => {
    it('renders 150 filler sequences by default', async () => {
      const html = await render()

      const count = (html.match(/ ﻿͏/g) || []).length
      expect(count).toBe(150)
    })

    it('accepts a custom count', async () => {
      const html = await render({ spaces: 5 })

      const count = (html.match(/ ﻿͏/g) || []).length
      expect(count).toBe(5)
    })

    it('renders nothing when set to 0', async () => {
      const html = await render({ spaces: 0 })

      expect(html).not.toContain(' ﻿͏')
    })
  })

  describe('nbsp', () => {
    it('ends with a non-breaking space before closing div', async () => {
      const html = await render()

      expect(html).toContain(' </div>')
    })
  })
})

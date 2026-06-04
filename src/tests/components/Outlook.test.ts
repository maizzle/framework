import { describe, it, expect } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from '@vue/server-renderer'
import Outlook from '../../components/Outlook.vue'

function renderRaw(props: Record<string, string> = {}, slotFn?: () => any) {
  const app = createSSRApp({
    render: () => h(Outlook, props, {
      default: slotFn ?? (() => h('p', 'Test')),
    }),
  })

  return renderToString(app)
}

describe('Outlook', () => {
  describe('default (all Outlook versions)', () => {
    it('wraps slot content in mso conditional comments', async () => {
      const html = await renderRaw()

      expect(html).toContain('<!--[if mso]>')
      expect(html).toContain('<p>Test</p>')
      expect(html).toContain('<![endif]-->')
    })

    it('outputs comments in the correct order', async () => {
      const html = await renderRaw()

      const startIdx = html.indexOf('<!--[if mso]>')
      const contentIdx = html.indexOf('<p>Test</p>')
      const endIdx = html.indexOf('<![endif]-->')

      expect(startIdx).toBeGreaterThanOrEqual(0)
      expect(startIdx).toBeLessThan(contentIdx)
      expect(contentIdx).toBeLessThan(endIdx)
    })
  })

  describe('only prop', () => {
    it('targets a single Outlook version', async () => {
      const html = await renderRaw({ only: '2007' })
      expect(html).toContain('<!--[if mso 12]>')
    })

    it('targets multiple Outlook versions', async () => {
      const html = await renderRaw({ only: '2007, 2010' })
      expect(html).toContain('<!--[if (mso 12)|(mso 14)]>')
    })

    it('maps all known versions correctly', async () => {
      const versionMap: Record<string, string> = {
        '2003': '11',
        '2007': '12',
        '2010': '14',
        '2013': '15',
        '2016': '16',
        '2019': '16',
      }

      for (const [year, mso] of Object.entries(versionMap)) {
        const html = await renderRaw({ only: year })
        expect(html).toContain(`<!--[if mso ${mso}]>`)
      }
    })
  })

  describe('not prop', () => {
    it('excludes a single Outlook version', async () => {
      const html = await renderRaw({ not: '2007' })
      expect(html).toContain('<!--[if !mso 12]>')
    })

    it('excludes multiple Outlook versions', async () => {
      const html = await renderRaw({ not: '2007, 2010' })
      expect(html).toContain('<!--[if !(mso 12|mso 14)]>')
    })
  })

  describe('range props', () => {
    it('handles lt (less than)', async () => {
      const html = await renderRaw({ lt: '2010' })
      expect(html).toContain('<!--[if (lt mso 14)]>')
    })

    it('handles lte (less than or equal)', async () => {
      const html = await renderRaw({ lte: '2010' })
      expect(html).toContain('<!--[if (lte mso 14)]>')
    })

    it('handles gt (greater than)', async () => {
      const html = await renderRaw({ gt: '2007' })
      expect(html).toContain('<!--[if (gt mso 12)]>')
    })

    it('handles gte (greater than or equal)', async () => {
      const html = await renderRaw({ gte: '2007' })
      expect(html).toContain('<!--[if (gte mso 12)]>')
    })

    it('combines gt and lt for a range', async () => {
      const html = await renderRaw({ gt: '2003', lt: '2016' })

      expect(html).toContain('(lt mso 16)')
      expect(html).toContain('(gt mso 11)')
      expect(html).toContain('&')
    })

    it('combines gte and lte for an inclusive range', async () => {
      const html = await renderRaw({ gte: '2007', lte: '2013' })

      expect(html).toContain('(lte mso 15)')
      expect(html).toContain('(gte mso 12)')
      expect(html).toContain('&')
    })
  })

  describe('closing comment', () => {
    it('always outputs the endif closing comment', async () => {
      const html = await renderRaw({ only: '2007' })
      expect(html).toContain('<![endif]-->')
    })
  })

  describe('empty slot', () => {
    it('renders conditional comments with no content between them', async () => {
      const app = createSSRApp({
        render: () => h(Outlook),
      })
      const html = await renderToString(app)

      expect(html).toContain('<!--[if mso]>')
      expect(html).toContain('<![endif]-->')
    })
  })

  describe('open and close props', () => {
    it('inserts open prop after the conditional start', async () => {
      const html = await renderRaw({ open: '<table><tr><td>' })
      expect(html).toContain('<!--[if mso]><table><tr><td>')
    })

    it('inserts close prop before the conditional end', async () => {
      const html = await renderRaw({ close: '</td></tr></table>' })
      expect(html).toContain('</td></tr></table><![endif]-->')
    })

    it('preserves unbalanced open and close fragments around the slot', async () => {
      const html = await renderRaw(
        { open: '<table><tr><td>', close: '</td></tr></table>' },
        () => h('p', 'inside')
      )

      const openIdx = html.indexOf('<!--[if mso]><table><tr><td>')
      const slotIdx = html.indexOf('<p>inside</p>')
      const closeIdx = html.indexOf('</td></tr></table><![endif]-->')

      expect(openIdx).toBeGreaterThanOrEqual(0)
      expect(slotIdx).toBeGreaterThan(openIdx)
      expect(closeIdx).toBeGreaterThan(slotIdx)
    })

    it('combines open/close with version-targeted conditionals', async () => {
      const html = await renderRaw({
        only: '2013',
        open: '<table>',
        close: '</table>',
      })
      expect(html).toContain('<!--[if mso 15]><table>')
      expect(html).toContain('</table><![endif]-->')
    })

    it('emits raw HTML verbatim without escaping', async () => {
      const html = await renderRaw({ open: '<table align="center" width="600">' })
      expect(html).toContain('<table align="center" width="600">')
      expect(html).not.toContain('&lt;table')
    })

    it('omits open and close when not provided', async () => {
      const html = await renderRaw()
      expect(html).toContain('<!--[if mso]>')
      expect(html).not.toContain('<table>')
    })
  })
})

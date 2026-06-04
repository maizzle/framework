import { describe, it, expect } from 'vitest'
import { createSSRApp, h, Suspense } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { encode } from 'uqr'
import QrCode from '../../components/QrCode.vue'

function render(props: Record<string, unknown>) {
  const app = createSSRApp({
    render: () => h(Suspense, null, {
      default: () => h(QrCode, props as any),
    }),
  })
  return renderToString(app)
}

const URL = 'https://maizzle.com'

describe('QrCode', () => {
  describe('rendering', () => {
    it('renders a presentation table with role="img"', async () => {
      const html = await render({ value: URL })

      expect(html).toContain('<table')
      expect(html).toContain('role="img"')
      expect(html).toContain('cellpadding="0"')
      expect(html).toContain('cellspacing="0"')
      expect(html).toContain('border="0"')
    })

    it('emits one td per matrix cell', async () => {
      const html = await render({ value: URL, ecc: 'M', border: 1 })
      const matrix = encode(URL, { ecc: 'M', border: 1, boostEcc: true })
      const expected = matrix.size * matrix.size
      const tdCount = (html.match(/<td/g) ?? []).length

      expect(tdCount).toBe(expected)
    })

    it('emits one tr per matrix row', async () => {
      const html = await render({ value: URL, ecc: 'M', border: 1 })
      const matrix = encode(URL, { ecc: 'M', border: 1, boostEcc: true })
      const trCount = (html.match(/<tr/g) ?? []).length

      expect(trCount).toBe(matrix.size)
    })

    it('emits dark cells with class="qd" and light cells with no class — no inline cell styles', async () => {
      const html = await render({ value: URL })

      expect(html).toContain('<td class="qd"></td>')
      expect(html).toContain('<td></td>')
      // No inline style on any cell
      expect(html).not.toMatch(/<td[^>]*style=/)
    })
  })

  describe('default Tailwind classes on the table', () => {
    it('emits cell sizing variants on the table', async () => {
      const html = await render({ value: URL })
      const dim = encode(URL, { ecc: 'M', border: 1, boostEcc: true }).size
      const cellPx = Math.max(1, Math.floor(120 / dim))

      expect(html).toContain(`[&amp;_td]:w-[${cellPx}px]`)
      expect(html).toContain(`[&amp;_td]:h-[${cellPx}px]`)
      expect(html).toContain('[&amp;_td]:text-[0px]')
    })

    it('paints the table background in white/gray-950 (light cells show through) and dark cells via qr:', async () => {
      const html = await render({ value: URL })

      expect(html).toMatch(/class="[^"]*\sbg-white(?:\s|")/)
      expect(html).toMatch(/class="[^"]*\sdark:bg-gray-950(?:\s|")/)
      expect(html).toContain('qr:bg-gray-950')
      expect(html).toContain('dark:qr:bg-white')
    })

    it('table outer size matches cell math exactly (no empty stripe)', async () => {
      const html = await render({ value: URL })
      const dim = encode(URL, { ecc: 'M', border: 1, boostEcc: true }).size
      const cellPx = Math.max(1, Math.floor(120 / dim))
      const totalPx = cellPx * dim

      expect(html).toContain(`size-[${totalPx}px]`)
    })
  })

  describe('user bg classes paint the table directly', () => {
    it('forwards `bg-*` onto the table verbatim', async () => {
      const html = await render({ value: URL, class: 'bg-teal-300' })

      expect(html).toMatch(/class="[^"]*\sbg-teal-300(?:\s|")/)
    })

    it('forwards `dark:bg-*` onto the table verbatim', async () => {
      const html = await render({ value: URL, class: 'dark:bg-teal-300' })

      expect(html).toMatch(/class="[^"]*\sdark:bg-teal-300(?:\s|")/)
    })

    it('does not put bg classes on individual cells', async () => {
      const html = await render({ value: URL, class: 'bg-teal-300 dark:bg-teal-700' })

      expect(html).not.toMatch(/<td[^>]*class="[^"]*bg-/)
    })
  })

  describe('qr: variant for the dark modules', () => {
    it('forwards `qr:bg-*` onto the table verbatim', async () => {
      const html = await render({ value: URL, class: 'qr:bg-blue-900' })

      expect(html).toMatch(/class="[^"]*\sqr:bg-blue-900(?:\s|")/)
    })

    it('forwards `dark:qr:bg-*` onto the table verbatim', async () => {
      const html = await render({ value: URL, class: 'dark:qr:bg-blue-100' })

      expect(html).toMatch(/class="[^"]*\sdark:qr:bg-blue-100(?:\s|")/)
    })

    it('combines bg-* (table/light) and qr:bg-* (dark cells) on the same QR', async () => {
      const html = await render({
        value: URL,
        class: 'bg-teal-300 dark:bg-teal-700 qr:bg-blue-900 dark:qr:bg-blue-100',
      })

      expect(html).toMatch(/class="[^"]*\sbg-teal-300(?:\s|")/)
      expect(html).toMatch(/class="[^"]*\sdark:bg-teal-700(?:\s|")/)
      expect(html).toMatch(/class="[^"]*\sqr:bg-blue-900(?:\s|")/)
      expect(html).toMatch(/class="[^"]*\sdark:qr:bg-blue-100(?:\s|")/)
    })
  })

  describe('sizing via Tailwind class', () => {
    it('default size yields cellPx = floor(120/dim)', async () => {
      const html = await render({ value: URL })
      const dim = encode(URL, { ecc: 'M', border: 1, boostEcc: true }).size
      const cellPx = Math.floor(120 / dim)

      expect(html).toContain(`[&amp;_td]:w-[${cellPx}px]`)
    })

    it('numeric sizing class drives cell px math', async () => {
      const html = await render({ value: URL, class: 'size-40' })
      const dim = encode(URL, { ecc: 'M', border: 1, boostEcc: true }).size
      const cellPx = Math.floor(160 / dim)

      expect(html).toContain(`[&amp;_td]:w-[${cellPx}px]`)
      expect(html).toContain(`size-[${cellPx * dim}px]`)
    })

    it('arbitrary px value drives cell px math', async () => {
      const html = await render({ value: URL, class: 'size-[200px]' })
      const dim = encode(URL, { ecc: 'M', border: 1, boostEcc: true }).size
      const cellPx = Math.floor(200 / dim)

      expect(html).toContain(`[&amp;_td]:w-[${cellPx}px]`)
    })

    it('arbitrary rem value resolves to px', async () => {
      const html = await render({ value: URL, class: 'size-[10rem]' })
      const dim = encode(URL, { ecc: 'M', border: 1, boostEcc: true }).size
      const cellPx = Math.floor(160 / dim)

      expect(html).toContain(`[&amp;_td]:w-[${cellPx}px]`)
    })

    it('non-numeric sizing value falls back to the default 120px', async () => {
      const html = await render({ value: URL, class: 'w-full' })
      const dim = encode(URL, { ecc: 'M', border: 1, boostEcc: true }).size
      const cellPx = Math.floor(120 / dim)

      expect(html).toContain(`[&amp;_td]:w-[${cellPx}px]`)
    })

    it('min-w/max-w sizing token falls back to the default 120px', async () => {
      const html = await render({ value: URL, class: 'min-w-40' })
      const dim = encode(URL, { ecc: 'M', border: 1, boostEcc: true }).size
      const cellPx = Math.floor(120 / dim)

      expect(html).toContain(`[&amp;_td]:w-[${cellPx}px]`)
    })

    it('arbitrary value with an unsupported unit falls back to the default 120px', async () => {
      const html = await render({ value: URL, class: 'size-[10vh]' })
      const dim = encode(URL, { ecc: 'M', border: 1, boostEcc: true }).size
      const cellPx = Math.floor(120 / dim)

      expect(html).toContain(`[&amp;_td]:w-[${cellPx}px]`)
    })

    it('user sizing token does not pass through unmodified', async () => {
      const html = await render({ value: URL, class: 'size-40' })

      expect(html).not.toMatch(/class="[^"]*\ssize-40(?:\s|")/)
    })
  })

  describe('non-bg, non-sizing classes pass through to table', () => {
    it('forwards alignment classes', async () => {
      const html = await render({ value: URL, class: 'mx-auto' })

      expect(html).toContain('mx-auto')
    })

    it('forwards multiple unrelated utilities', async () => {
      const html = await render({ value: URL, class: 'mx-auto rounded shadow' })

      expect(html).toContain('mx-auto')
      expect(html).toContain('rounded')
      expect(html).toContain('shadow')
    })
  })

  describe('error correction', () => {
    it('renders with each ecc level without throwing', async () => {
      for (const ecc of ['L', 'M', 'Q', 'H'] as const) {
        const html = await render({ value: URL, ecc })
        expect(html).toContain('<table')
      }
    })
  })

  describe('border (quiet zone)', () => {
    it('larger border increases matrix dim', async () => {
      const small = encode(URL, { ecc: 'M', border: 1, boostEcc: true })
      const large = encode(URL, { ecc: 'M', border: 4, boostEcc: true })
      expect(large.size).toBe(small.size + 6)

      const html = await render({ value: URL, border: 4, ecc: 'M' })
      const trCount = (html.match(/<tr/g) ?? []).length
      expect(trCount).toBe(large.size)
    })
  })

  describe('accessibility', () => {
    it('omits aria-label when alt is empty', async () => {
      const html = await render({ value: URL })
      expect(html).not.toContain('aria-label')
    })

    it('sets aria-label from alt prop', async () => {
      const html = await render({ value: URL, alt: 'Scan to visit Maizzle' })
      expect(html).toContain('aria-label="Scan to visit Maizzle"')
    })

    it('escapes alt text', async () => {
      const html = await render({ value: URL, alt: '<scan> "now"' })
      expect(html).toContain('aria-label="&lt;scan&gt; &quot;now&quot;"')
    })
  })

  describe('attrs forwarding', () => {
    it('forwards style attribute to the table', async () => {
      const html = await render({ value: URL, style: 'border:1px solid red' })
      expect(html).toContain('style="border:1px solid red"')
    })
  })
})

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { render } from '../../render/index.ts'

describe('Layout', () => {
  let tempDir: string
  const originalCwd = process.cwd()

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'maizzle-layout-'))
    process.chdir(tempDir)
  })

  afterEach(() => {
    process.chdir(originalCwd)
    rmSync(tempDir, { recursive: true, force: true })
  })

  describe('doubleHead prop', () => {
    it('does not render an empty head by default', async () => {
      const result = await render(`
        <template>
          <Layout>
            <div>Test</div>
          </Layout>
        </template>
      `)

      expect(result.html).not.toContain('<head></head>')
    })

    it('renders an empty head before main head when doubleHead is true', async () => {
      const result = await render(`
        <template>
          <Layout :double-head="true">
            <div>Test</div>
          </Layout>
        </template>
      `)

      const first = result.html.indexOf('<head></head>')
      const second = result.html.indexOf('<head>', first + 13)
      expect(first).toBeGreaterThan(-1)
      expect(second).toBeGreaterThan(first)
    })

    it('renders an empty head before main head when doubleHead is the string "true"', async () => {
      const result = await render(`
        <template>
          <Layout double-head="true">
            <div>Test</div>
          </Layout>
        </template>
      `)

      const first = result.html.indexOf('<head></head>')
      const second = result.html.indexOf('<head>', first + 13)
      expect(first).toBeGreaterThan(-1)
      expect(second).toBeGreaterThan(first)
    })

    it('does not render an empty head when doubleHead is false', async () => {
      const result = await render(`
        <template>
          <Layout :double-head="false">
            <div>Test</div>
          </Layout>
        </template>
      `)

      expect(result.html).not.toContain('<head></head>')
    })

    it('does not render an empty head when doubleHead is an arbitrary string', async () => {
      const result = await render(`
        <template>
          <Layout double-head="false">
            <div>Test</div>
          </Layout>
        </template>
      `)

      expect(result.html).not.toContain('<head></head>')
    })
  })

  describe('lang prop', () => {
    it('defaults lang to en on html, body xml:lang, and article', async () => {
      const result = await render(`
        <template>
          <Layout>
            <div>Test</div>
          </Layout>
        </template>
      `)

      expect(result.html).toMatch(/<html[^>]*\blang="en"/)
      expect(result.html).toMatch(/<body[^>]*\bxml:lang="en"/)
      expect(result.html).toMatch(/<div[^>]*role="article"[^>]*\blang="en"/)
    })

    it('accepts a custom lang', async () => {
      const result = await render(`
        <template>
          <Layout lang="fr">
            <div>Test</div>
          </Layout>
        </template>
      `)

      expect(result.html).toMatch(/<html[^>]*\blang="fr"/)
      expect(result.html).toMatch(/<body[^>]*\bxml:lang="fr"/)
      expect(result.html).toMatch(/<div[^>]*role="article"[^>]*\blang="fr"/)
    })
  })

  describe('dir prop', () => {
    it('defaults dir to ltr on html and article', async () => {
      const result = await render(`
        <template>
          <Layout>
            <div>Test</div>
          </Layout>
        </template>
      `)

      expect(result.html).toMatch(/<html[^>]*\bdir="ltr"/)
      expect(result.html).toMatch(/<div[^>]*role="article"[^>]*\bdir="ltr"/)
    })

    it('accepts rtl direction', async () => {
      const result = await render(`
        <template>
          <Layout dir="rtl">
            <div>Test</div>
          </Layout>
        </template>
      `)

      expect(result.html).toMatch(/<html[^>]*\bdir="rtl"/)
      expect(result.html).toMatch(/<div[^>]*role="article"[^>]*\bdir="rtl"/)
    })
  })

  describe('bodyClass prop', () => {
    it('applies default body classes', async () => {
      const result = await render(`
        <template>
          <Layout>
            <div>Test</div>
          </Layout>
        </template>
      `)

      const bodyMatch = result.html.match(/<body[^>]*\bclass="([^"]*)"/)
      expect(bodyMatch).not.toBeNull()
      const bodyClass = bodyMatch![1]
      expect(bodyClass).toContain('m-0')
      expect(bodyClass).toContain('p-0')
      expect(bodyClass).toContain('size-full')
      expect(bodyClass).toMatch(/word-break/)
    })

    it('merges custom bodyClass with defaults via twMerge', async () => {
      const result = await render(`
        <template>
          <Layout body-class="bg-gray-100">
            <div>Test</div>
          </Layout>
        </template>
      `)

      const bodyMatch = result.html.match(/<body[^>]*\bclass="([^"]*)"/)
      expect(bodyMatch).not.toBeNull()
      const bodyClass = bodyMatch![1]
      expect(bodyClass).toContain('bg-gray-100')
      expect(bodyClass).toContain('m-0')
    })

    it('lets bodyClass override conflicting default utilities', async () => {
      const result = await render(`
        <template>
          <Layout body-class="m-4">
            <div>Test</div>
          </Layout>
        </template>
      `)

      const bodyMatch = result.html.match(/<body[^>]*\bclass="([^"]*)"/)
      expect(bodyMatch).not.toBeNull()
      const bodyClass = bodyMatch![1]
      expect(bodyClass).toContain('m-4')
      expect(bodyClass).not.toMatch(/\bm-0\b/)
    })
  })

  describe('ariaLabel prop', () => {
    it('sets aria-label on the article div', async () => {
      const result = await render(`
        <template>
          <Layout aria-label="Order confirmation">
            <div>Test</div>
          </Layout>
        </template>
      `)

      expect(result.html).toMatch(/<div[^>]*role="article"[^>]*\baria-label="Order confirmation"/)
    })

    it('omits aria-label by default', async () => {
      const result = await render(`
        <template>
          <Layout>
            <div>Test</div>
          </Layout>
        </template>
      `)

      const articleMatch = result.html.match(/<div[^>]*role="article"[^>]*>/)
      expect(articleMatch).not.toBeNull()
      expect(articleMatch![0]).not.toContain('aria-label')
    })
  })

  describe('attrs forwarding', () => {
    it('merges class attribute onto the article div, not the body', async () => {
      const result = await render(`
        <template>
          <Layout class="font-sans">
            <div>Test</div>
          </Layout>
        </template>
      `)

      const articleMatch = result.html.match(/<div[^>]*role="article"[^>]*\bclass="([^"]*)"/)
      expect(articleMatch).not.toBeNull()
      const articleClass = articleMatch![1]
      expect(articleClass).toContain('font-sans')

      const bodyMatch = result.html.match(/<body[^>]*\bclass="([^"]*)"/)
      expect(bodyMatch![1]).not.toContain('font-sans')
    })

    it('article has default font-inter and font-size utilities', async () => {
      const result = await render(`
        <template>
          <Layout>
            <div>Test</div>
          </Layout>
        </template>
      `)

      const articleMatch = result.html.match(/<div[^>]*role="article"[^>]*\bclass="([^"]*)"/)
      expect(articleMatch).not.toBeNull()
      const articleClass = articleMatch![1]
      expect(articleClass).toContain('font-inter')
      expect(articleClass).toMatch(/font-size/)
    })

    it('lets a class attr override the default font-inter via twMerge', async () => {
      const result = await render(`
        <template>
          <Layout class="font-mono">
            <div>Test</div>
          </Layout>
        </template>
      `)

      const articleMatch = result.html.match(/<div[^>]*role="article"[^>]*\bclass="([^"]*)"/)
      const articleClass = articleMatch![1]
      expect(articleClass).toContain('font-mono')
      expect(articleClass).not.toMatch(/\bfont-inter\b/)
    })
  })

  describe('slot', () => {
    it('renders slot content inside the article div', async () => {
      const result = await render(`
        <template>
          <Layout>
            <p>Slotted content</p>
          </Layout>
        </template>
      `)

      const articleMatch = result.html.match(/<div[^>]*role="article"[^>]*>([\s\S]*?)<\/div>\s*<\/body>/)
      expect(articleMatch).not.toBeNull()
      expect(articleMatch![1]).toContain('<p>Slotted content</p>')
    })
  })

  describe('default head', () => {
    it('includes the standard meta tags', async () => {
      const result = await render(`
        <template>
          <Layout>
            <div>Test</div>
          </Layout>
        </template>
      `)

      expect(result.html).toContain('charset="utf-8"')
      expect(result.html).toContain('name="x-apple-disable-message-reformatting"')
      expect(result.html).toMatch(/name="viewport"[^>]*content="width=device-width, initial-scale=1"/)
      expect(result.html).toMatch(/name="format-detection"[^>]*content="telephone=no, date=no, address=no, email=no, url=no"/)
      expect(result.html).toMatch(/name="color-scheme"[^>]*content="light dark"/)
      expect(result.html).toMatch(/name="supported-color-schemes"[^>]*content="light dark"/)
    })

  })

  describe('default body', () => {
    it('includes the MSO conditional block', async () => {
      const result = await render(`
        <template>
          <Layout>
            <div>Test</div>
          </Layout>
        </template>
      `)

      expect(result.html).toContain('<o:OfficeDocumentSettings>')
      expect(result.html).toContain('<o:PixelsPerInch>96</o:PixelsPerInch>')
      expect(result.html).toContain('<w:DontUseAdvancedTypographyReadingMail />')
    })
  })

  describe('outlookFallback=false', () => {
    it('omits the MSO head block and xmlns:v / xmlns:o on <html>', async () => {
      const result = await render(`
        <template>
          <Layout :outlook-fallback="false">
            <div>Test</div>
          </Layout>
        </template>
      `)

      expect(result.html).not.toContain('o:OfficeDocumentSettings')
      expect(result.html).not.toContain('mso-line-height-rule')
      expect(result.html).not.toContain('xmlns:v')
      expect(result.html).not.toContain('xmlns:o')
      expect(result.html).not.toContain('xml:lang')
    })

    it('propagates to descendant Container — no MSO ghost table', async () => {
      const result = await render(`
        <template>
          <Layout :outlook-fallback="false">
            <Container>Hi</Container>
          </Layout>
        </template>
      `)

      expect(result.html).not.toContain('<!--[if mso]>')
    })
  })
})

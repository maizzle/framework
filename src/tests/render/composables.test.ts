import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { rmSync } from 'node:fs'
import { render } from '../../render/index.ts'
import { createTempProject } from './_helpers.ts'

describe('render', () => {
  let tempDir: string
  const originalCwd = process.cwd()

  beforeEach(() => {
    tempDir = createTempProject()
    process.chdir(tempDir)
  })

  afterEach(() => {
    process.chdir(originalCwd)
    rmSync(tempDir, { recursive: true, force: true })
  })

  describe('usePreheader', () => {
    it('injects preheader text div at start of body', async () => {
      const result = await render(`
        <script setup>
        usePreheader('Welcome aboard!')
        </script>
        <template>
          <html>
            <head></head>
            <body>
              <h1>Hello</h1>
            </body>
          </html>
        </template>
      `, { useTransformers: false })

      expect(result.html).toContain('display:none')
      expect(result.html).toContain('Welcome aboard!')
      // Preview div should be before h1
      const bodyContent = result.html.match(/<body>([\s\S]*?)<\/body>/)?.[1] ?? ''
      expect(bodyContent.indexOf('Welcome aboard!')).toBeLessThan(bodyContent.indexOf('<h1>'))
    })

    it('uses custom filler and shy counts', async () => {
      const result = await render(`
        <script setup>
        usePreheader('Hi', { fillerCount: 2, shyCount: 3 })
        </script>
        <template>
          <html>
            <head></head>
            <body><p>Test</p></body>
          </html>
        </template>
      `, { useTransformers: false })

      expect(result.html).toContain('Hi')
      expect(result.html).toContain('display:none')
    })
  })

  describe('useBaseUrl', () => {
    it('prepends a base URL to relative href values', async () => {
      const result = await render(`
        <script setup>
        useBaseUrl('https://cdn.example.com/')
        </script>
        <template>
          <html><head></head><body><a href="page.html">link</a></body></html>
        </template>
      `)

      expect(result.html).toMatch(/href="https:\/\/cdn\.example\.com\/page\.html"/)
    })

    it('accepts an object form for fine-grained control', async () => {
      const result = await render(`
        <script setup>
        useBaseUrl({ url: 'https://cdn.example.com/', tags: ['a'] })
        </script>
        <template>
          <html><head></head><body><a href="page.html">link</a><img src="logo.png"></body></html>
        </template>
      `)

      expect(result.html).toMatch(/href="https:\/\/cdn\.example\.com\/page\.html"/)
      // tags: ['a'] limits to anchors → img stays as-is
      expect(result.html).toMatch(/src="logo\.png"/)
    })
  })

  describe('useUrlQuery', () => {
    it('appends query params to URLs', async () => {
      const result = await render(`
        <script setup>
        useUrlQuery({ utm_source: 'maizzle', utm_campaign: 'newsletter' })
        </script>
        <template>
          <html><head></head><body><a href="https://example.com/">link</a></body></html>
        </template>
      `)

      expect(result.html).toMatch(/utm_source=maizzle/)
      expect(result.html).toMatch(/utm_campaign=newsletter/)
    })
  })

  describe('useHead integration', () => {
    it('injects head tags from useHead()', async () => {
      const result = await render(`
        <script setup>
        useHead({
          meta: [{ name: 'description', content: 'Test email' }],
        })
        </script>
        <template>
          <html>
            <head></head>
            <body><p>Hello</p></body>
          </html>
        </template>
      `)

      expect(result.html).toContain('<meta name="description" content="Test email">')
    })

    it('injects html attributes from useHead()', async () => {
      const result = await render(`
        <script setup>
        useHead({
          htmlAttrs: { dir: 'rtl' },
        })
        </script>
        <template>
          <html>
            <head></head>
            <body><p>Hello</p></body>
          </html>
        </template>
      `)

      expect(result.html).toContain('dir="rtl"')
    })

    it('injects script tags at end of body', async () => {
      const result = await render(`
        <script setup>
        useHead({
          script: [{ src: 'https://example.com/tracker.js', tagPosition: 'bodyClose' }],
        })
        </script>
        <template>
          <html>
            <head></head>
            <body><p>Hello</p></body>
          </html>
        </template>
      `)

      expect(result.html).toContain('tracker.js')
      const bodyContent = result.html.match(/<body>([\s\S]*?)<\/body>/)?.[1] ?? ''
      expect(bodyContent.indexOf('tracker.js')).toBeGreaterThan(bodyContent.indexOf('<p>'))
    })

    it('injects noscript tags at start of body', async () => {
      const result = await render(`
        <script setup>
        useHead({
          noscript: [{ innerHTML: '<img src="https://example.com/pixel.gif">', tagPosition: 'bodyOpen' }],
        })
        </script>
        <template>
          <html>
            <head></head>
            <body><p>Hello</p></body>
          </html>
        </template>
      `)

      expect(result.html).toContain('pixel.gif')
    })

    it('injects body attributes from useHead()', async () => {
      const result = await render(`
        <script setup>
        useHead({
          bodyAttrs: { class: 'email-body' },
        })
        </script>
        <template>
          <html>
            <head></head>
            <body><p>Hello</p></body>
          </html>
        </template>
      `)

      expect(result.html).toContain('class="email-body"')
    })
  })

  describe('plaintext', () => {
    it('returns plaintext when config.plaintext is true', async () => {
      const result = await render(`
        <template>
          <div><h1>Hello</h1><p>World</p></div>
        </template>
      `, { plaintext: true })

      expect(result.plaintext).toBeDefined()
      expect(result.plaintext).toContain('Hello')
      expect(result.plaintext).toContain('World')
      expect(result.plaintext).not.toContain('<div>')
    })

    it('does not return plaintext by default', async () => {
      const result = await render(`
        <template>
          <div>Hello</div>
        </template>
      `)

      expect(result.plaintext).toBeUndefined()
    })

    it('returns plaintext when usePlaintext() is called in SFC', async () => {
      const result = await render(`
        <script setup>
        usePlaintext()
        </script>
        <template>
          <div>Hello from SFC</div>
        </template>
      `)

      expect(result.plaintext).toBeDefined()
      expect(result.plaintext).toContain('Hello from SFC')
      expect(result.plaintext).not.toContain('<div>')
    })

    it('passes strip options via plaintext.options', async () => {
      const result = await render(`
        <template>
          <div>Hello</div><br/>World
        </template>
      `, { plaintext: { options: { ignoreTags: ['br'] } } })

      expect(result.plaintext).toContain('<br>')
    })

    it('passes strip options via usePlaintext({ options })', async () => {
      const result = await render(`
        <script setup>
        usePlaintext({ options: { ignoreTags: ['br'] } })
        </script>
        <template>
          <div>Hello</div><br/>World
        </template>
      `)

      expect(result.plaintext).toContain('<br>')
    })

    it('SFC options override global options per-key', async () => {
      const result = await render(`
        <script setup>
        usePlaintext({ options: { ignoreTags: ['br'] } })
        </script>
        <template>
          <div>Hello</div><br/>World
        </template>
      `, { plaintext: { options: { ignoreTags: ['p'] } } })

      expect(result.plaintext).toContain('<br>')
    })
  })
})

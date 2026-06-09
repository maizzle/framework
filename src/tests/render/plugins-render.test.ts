import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { rmSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { render } from '../../render/index.ts'
import { createTempProject, writeSfc } from './_helpers.ts'

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

  describe('CodeBlock extract plugin', () => {
    it('extracts slot content and passes as code prop', async () => {
      const result = await render(`
        <template>
          <html>
            <head></head>
            <body>
              <CodeBlock lang="html">
                <div class="test">Hello</div>
              </CodeBlock>
            </body>
          </html>
        </template>
      `)

      expect(result.html).toContain('Hello')
    })
  })

  describe('Row source-location plugin and warning', () => {
    it('warns when <Row> has element children but no <Column>', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      try {
        // Distinct shape per test to dodge Row.vue's module-level dedupe set.
        await render(`
          <template>
            <Row><p>row-warn-test-element</p></Row>
          </template>
        `)
        const calls = warn.mock.calls.map(c => String(c[0]))
        expect(calls.some(s => /\[maizzle\] <Row>.*has no <Column>/.test(s))).toBe(true)
      } finally {
        warn.mockRestore()
      }
    })

    it('warns when <Row> has only text content', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      try {
        await render(`
          <template>
            <Row>row-warn-test-text-only</Row>
          </template>
        `)
        const calls = warn.mock.calls.map(c => String(c[0]))
        expect(calls.some(s => /\[maizzle\] <Row>.*has no <Column>/.test(s))).toBe(true)
      } finally {
        warn.mockRestore()
      }
    })

    it('does not warn when <Row> contains a <Column>', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      try {
        await render(`
          <template>
            <Row><Column>row-warn-test-good</Column></Row>
          </template>
        `)
        const calls = warn.mock.calls.map(c => String(c[0]))
        expect(calls.some(s => /\[maizzle\] <Row>/.test(s))).toBe(false)
      } finally {
        warn.mockRestore()
      }
    })

    it('does not warn for an empty <Row />', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      try {
        await render(`
          <template>
            <Row />
          </template>
        `)
        const calls = warn.mock.calls.map(c => String(c[0]))
        expect(calls.some(s => /\[maizzle\] <Row>/.test(s))).toBe(false)
      } finally {
        warn.mockRestore()
      }
    })

    it('strips data-maizzle-loc from the rendered output', async () => {
      const result = await render(`
        <template>
          <Row><Column>x</Column></Row>
        </template>
      `)
      expect(result.html).not.toContain('data-maizzle-loc')
    })
  })

  describe('Markdown extract plugin', () => {
    it('extracts slot content from Markdown component', async () => {
      const result = await render(`
        <template>
          <html>
            <head></head>
            <body>
              <Markdown>
                # Hello World
              </Markdown>
            </body>
          </html>
        </template>
      `)

      expect(result.html).toContain('Hello World')
    })

    it('resolves Markdown src prop from file', async () => {
      mkdirSync(join(tempDir, 'emails'), { recursive: true })
      writeFileSync(join(tempDir, 'emails/content.md'), '# From File')

      writeSfc(tempDir, 'emails/test-md-src.vue', `
        <template>
          <html>
            <head></head>
            <body>
              <Markdown src="./content.md" />
            </body>
          </html>
        </template>
      `)

      const result = await render(join(tempDir, 'emails/test-md-src.vue'))

      expect(result.html).toContain('From File')
    })

    it('falls back gracefully when a .md fence uses an unknown language', async () => {
      writeFileSync(join(tempDir, 'page.md'), [
        '```notalang',
        'plain text',
        '```',
      ].join('\n'))

      // Shiki throws on an unknown language; the .md highlight callback must
      // catch it and fall back, so the build does not crash.
      const result = await render(join(tempDir, 'page.md'), { useTransformers: false })

      expect(result.html).toContain('plain text')
      expect(result.html).toContain('<table class="w-full">')
    })

    it('keeps email-safe code-block wrapping when a custom markdownSetup is set', async () => {
      writeFileSync(join(tempDir, 'page.md'), [
        '```js',
        'const x = 1',
        '```',
      ].join('\n'))

      // A user markdownSetup must not clobber the built-in fence wrapping.
      const result = await render(join(tempDir, 'page.md'), {
        useTransformers: false,
        markdown: { markdownSetup() {} },
      })

      expect(result.html).toContain('<table class="w-full">')
    })

    it('accepts config prop for markdown-exit options', async () => {
      const result = await render(`
        <template>
          <html>
            <head></head>
            <body>
              <Markdown :config="{ typographer: false }">
                "Hello" -- world...
              </Markdown>
            </body>
          </html>
        </template>
      `)

      // With typographer: false, quotes and dashes should NOT be smartified
      expect(result.html).toContain('"Hello"')
      expect(result.html).toContain('--')
    })

    it('wraps .md template in component named in `layout:` frontmatter', async () => {
      writeSfc(tempDir, 'components/MdShell.vue', `
        <template>
          <section class="md-shell">
            <slot />
          </section>
        </template>
      `)

      writeFileSync(join(tempDir, 'page.md'), [
        '---',
        'layout: MdShell',
        '---',
        '',
        '# Hello',
      ].join('\n'))

      const result = await render(join(tempDir, 'page.md'), {
        root: tempDir,
        components: { source: ['components'] },
      })

      expect(result.html).toContain('class="md-shell"')
      expect(result.html).toMatch(/<section[^>]*class="md-shell"[^>]*>[\s\S]*<h1[^>]*>Hello<\/h1>[\s\S]*<\/section>/)
    })

    it('wraps .md template in built-in MarkdownLayout by default when no layout frontmatter is set', async () => {
      writeFileSync(join(tempDir, 'page.md'), '# Hello')

      const result = await render(join(tempDir, 'page.md'), { useTransformers: false })

      expect(result.html).toContain('<h1')
      // Built-in Layout output markers (MarkdownLayout wraps Layout)
      expect(result.html).toContain('role="article"')
      expect(result.html).toMatch(/<html[^>]*\blang="en"/)
      // MarkdownLayout-specific: Container with max-w-xl wrapping the markdown
      expect(result.html).toMatch(/role="article"[^>]*>[\s\S]*max-w-xl[\s\S]*<h1/)
    })

    it('passes frontmatter through MarkdownLayout to Layout (lang)', async () => {
      writeFileSync(join(tempDir, 'page.md'), [
        '---',
        'lang: fr',
        '---',
        '',
        '# Bonjour',
      ].join('\n'))

      const result = await render(join(tempDir, 'page.md'))

      expect(result.html).toMatch(/<html[^>]*\blang="fr"/)
    })

    it('skips default Layout wrap when `.md` lives in a components dir', async () => {
      writeSfc(tempDir, 'components/Promo.md', '# Promo content')

      writeSfc(tempDir, 'emails/page.vue', `
        <template>
          <Layout>
            <Promo />
          </Layout>
        </template>
      `)

      const result = await render(join(tempDir, 'emails/page.vue'), {
        root: tempDir,
        components: { source: ['components'] },
      })

      // Single Layout-rendered article (the parent), not a nested duplicate.
      const articleCount = (result.html.match(/role="article"/g) ?? []).length
      expect(articleCount).toBe(1)
      expect(result.html).toContain('Promo content')
    })

    it('opts out of default wrap when frontmatter sets `layout: false`', async () => {
      writeFileSync(join(tempDir, 'page.md'), [
        '---',
        'layout: false',
        '---',
        '',
        '# Hello',
      ].join('\n'))

      const result = await render(join(tempDir, 'page.md'))

      expect(result.html).toContain('<h1')
      expect(result.html).not.toContain('role="article"')
    })

    it('typographer is enabled by default', async () => {
      const result = await render(`
        <template>
          <html>
            <head></head>
            <body>
              <Markdown>
                "Hello" -- world...
              </Markdown>
            </body>
          </html>
        </template>
      `)

      // With typographer: true (default), quotes become smart quotes and -- becomes en dash
      expect(result.html).not.toContain('"Hello"')
      expect(result.html).not.toContain('--')
    })
  })
})

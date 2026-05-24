import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { rmSync, symlinkSync } from 'node:fs'
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

  describe('transformers', () => {
    it('compiles Tailwind CSS utilities', async () => {
      symlinkSync(join(originalCwd, 'node_modules'), join(tempDir, 'node_modules'))

      writeSfc(tempDir, 'emails/test.vue', `
        <template>
          <html>
            <head>
              <style>@import "tailwindcss/utilities" important;</style>
            </head>
            <body>
              <div class="[border:1px_solid_red]">Test</div>
            </body>
          </html>
        </template>
      `)

      const result = await render(join(tempDir, 'emails/test.vue'))

      expect(result.html).toContain('border: 1px solid red')
    })

    it('Tailwind component compiles scoped CSS into <head> using bundled @maizzle/tailwindcss', async () => {
      symlinkSync(join(originalCwd, 'node_modules'), join(tempDir, 'node_modules'))

      writeSfc(tempDir, 'emails/test.vue', `
        <template>
          <html>
            <head>
              <title>Test</title>
            </head>
            <body>
              <Tailwind>
                <div class="[border:1px_solid_red]">Inside</div>
              </Tailwind>
              <div class="[border:1px_solid_blue]">Outside</div>
            </body>
          </html>
        </template>
      `)

      const result = await render(join(tempDir, 'emails/test.vue'))

      expect(result.html).toContain('border: 1px solid red')
      expect(result.html).not.toContain('mz-tw:')
      expect(result.html).not.toContain('border: 1px solid blue')
    })

    it('Tailwind component reads CSS from #config slot', async () => {
      symlinkSync(join(originalCwd, 'node_modules'), join(tempDir, 'node_modules'))

      writeSfc(tempDir, 'emails/test.vue', `
        <template>
          <html>
            <head><title>Test</title></head>
            <body>
              <Tailwind>
                <template #config>
                  @import "tailwindcss/utilities";
                </template>
                <div class="[border:1px_solid_red]">Inside</div>
              </Tailwind>
            </body>
          </html>
        </template>
      `)

      const result = await render(join(tempDir, 'emails/test.vue'))

      expect(result.html).toContain('border: 1px solid red')
      expect(result.html).not.toContain('mz-tw:')
    })

    it('Tailwind component reproduces stack overflow', async () => {
      symlinkSync(join(originalCwd, 'node_modules'), join(tempDir, 'node_modules'))

      writeSfc(tempDir, 'emails/test.vue', `
        <template>
          <Html>
            <Head />
            <Body>
              <Tailwind>
                <Container class="max-w-xl">
                  <Text><strong>3 even cols</strong></Text>
                  <Row>
                    <Column class="w-1/3 bg-sky-200">
                      <Section class="px-2 border-0">
                        <Text>1/3</Text>
                      </Section>
                    </Column>
                    <Column class="w-1/3 bg-sky-400">
                      <Section class="px-2 border-0">
                        <Text>1/3</Text>
                      </Section>
                    </Column>
                    <Column class="w-1/3 bg-sky-600">
                      <Section class="px-2 border-0">
                        <Text>1/3</Text>
                      </Section>
                    </Column>
                  </Row>
                </Container>
              </Tailwind>
            </Body>
          </Html>
        </template>
      `)

      const result = await render(join(tempDir, 'emails/test.vue'))
      expect(result.html).toContain('1/3')
    })

    it('Tailwind component flattens nested instances into the outermost block', async () => {
      symlinkSync(join(originalCwd, 'node_modules'), join(tempDir, 'node_modules'))

      writeSfc(tempDir, 'emails/test.vue', `
        <template>
          <html>
            <head><title>Test</title></head>
            <body>
              <Tailwind>
                <div class="[border:1px_solid_red]">Outer</div>
                <Tailwind>
                  <div class="[border:1px_solid_green]">Inner</div>
                </Tailwind>
              </Tailwind>
            </body>
          </html>
        </template>
      `)

      const result = await render(join(tempDir, 'emails/test.vue'))

      // Both classes compile (inner classes flow up to the outermost block)
      expect(result.html).toContain('border: 1px solid red')
      expect(result.html).toContain('border: 1px solid green')
      // Markers stripped
      expect(result.html).not.toContain('mz-tw:')
      /**
       * Only one <style> block from <Tailwind> (no duplication from
       * a nested inner block compiling separately).
       */
      const matches = result.html.match(/border: 1px solid green/g)
      expect(matches).toHaveLength(1)
    })

    it('skips transformers when useTransformers is false', async () => {
      const result = await render(`
        <script setup>
        defineConfig({
          useTransformers: false,
        })
        </script>
        <template>
          <html>
            <head>
              <style>.test { color: red; }</style>
            </head>
            <body>
              <div class="test">Test</div>
            </body>
          </html>
        </template>
      `)

      // CSS should remain in <style>, not inlined
      expect(result.html).toContain('<div class="test">Test</div>')
    })

    it('skips transformers when useTransformers(false) is called from SFC', async () => {
      const result = await render(`
        <script setup>
        useTransformers(false)
        </script>
        <template>
          <html>
            <head>
              <style>.test { color: red; }</style>
            </head>
            <body>
              <div class="test">Test</div>
            </body>
          </html>
        </template>
      `)

      expect(result.html).toContain('<div class="test">Test</div>')
      expect(result.html).toContain('<style>.test { color: red; }</style>')
    })

    it('skips only inlineCss when useTransformers is given a granular toggle', async () => {
      const result = await render(`
        <script setup>
        defineConfig({
          useTransformers: { inlineCss: false },
        })
        </script>
        <template>
          <html>
            <head>
              <style>.test { color: red; }</style>
            </head>
            <body>
              <div class="test">Test</div>
            </body>
          </html>
        </template>
      `)

      // inlineCss skipped → class stays on the div, rule stays inside <style>
      expect(result.html).toContain('class="test"')
      expect(result.html).toMatch(/<style[^>]*>[\s\S]*\.test[\s\S]*color:\s*red[\s\S]*<\/style>/)
      expect(result.html).not.toMatch(/style="[^"]*color:\s*red/)
    })

    it('useTransformers({ ... }) preserves config defaults instead of replacing them', async () => {
      /**
       * Repro for: SFC calling useTransformers with a partial override
       * would drop defaults like css.inline / css.purge, because
       * sfcConfig replaced the resolved config wholesale.
       * Renderer must merge.
       */
      const result = await render(`
        <script setup>
        useTransformers({ prettify: true })
        </script>
        <template>
          <html><head><style>.foo { color: red; }</style></head><body><div class="foo">hello</div></body></html>
        </template>
      `)

      // inline default still applies → class becomes inline style
      expect(result.html).toMatch(/style="[^"]*color:\s*red/)
      // purge default still applies → empty <style> stripped
      expect(result.html).not.toContain('<style>')
    })

    it('useTransformers({ prettify: true }) force-enables format even without html.format set', async () => {
      const result = await render(`
        <script setup>
        useTransformers({ prettify: true })
        </script>
        <template>
          <html><head></head><body><div>x</div></body></html>
        </template>
      `)

      // oxfmt re-indents — html/head/body get split onto their own lines with indentation
      expect(result.html).toMatch(/<html>\n\s+<head>/)
      expect(result.html).toMatch(/<\/head>\n\s+<body>/)
    })

    it('skips format when minify is enabled — minify would clobber the indentation anyway', async () => {
      const result = await render(`
        <script setup>
        defineConfig({ html: { format: true, minify: true } })
        </script>
        <template>
          <html><head></head><body><div>x</div></body></html>
        </template>
      `)

      // Single-line output: minify ran, format was skipped (no indentation between html/head/body)
      expect(result.html).not.toMatch(/<html>\n\s+<head>/)
      expect(result.html).not.toMatch(/<\/head>\n\s+<body>/)
    })

    it('granular toggle from useTransformers() composable opts out of a single pass', async () => {
      const result = await render(`
        <script setup>
        useTransformers({ inlineCss: false })
        </script>
        <template>
          <html>
            <head>
              <style>.test { color: red; }</style>
            </head>
            <body>
              <div class="test">Test</div>
            </body>
          </html>
        </template>
      `)

      expect(result.html).toContain('class="test"')
      expect(result.html).toMatch(/<style[^>]*>[\s\S]*\.test[\s\S]*color:\s*red[\s\S]*<\/style>/)
      expect(result.html).not.toMatch(/style="[^"]*color:\s*red/)
    })

    it('inlines CSS when enabled', async () => {
      symlinkSync(join(originalCwd, 'node_modules'), join(tempDir, 'node_modules'))

      writeSfc(tempDir, 'emails/test.vue', `
        <template>
          <html>
            <head>
              <style>.greeting { color: red; }</style>
            </head>
            <body>
              <div class="greeting">Hello</div>
            </body>
          </html>
        </template>
      `)

      const result = await render(join(tempDir, 'emails/test.vue'), {
        css: { inline: true },
      })

      expect(result.html).toContain('style="color: red;"')
    })

    it('does not inline CSS by default', async () => {
      symlinkSync(join(originalCwd, 'node_modules'), join(tempDir, 'node_modules'))

      writeSfc(tempDir, 'emails/test.vue', `
        <template>
          <html>
            <head>
              <style>.greeting { color: red; }</style>
            </head>
            <body>
              <div class="greeting">Hello</div>
            </body>
          </html>
        </template>
      `)

      const result = await render(join(tempDir, 'emails/test.vue'))

      expect(result.html).not.toContain('style="color: red"')
    })

    it('replaces strings', async () => {
      const result = await render(`
        <template>
          <div>Hello {name}</div>
        </template>
      `, {
        replaceStrings: { '{name}': 'World' },
      })

      expect(result.html).toContain('Hello World')
      expect(result.html).not.toContain('{name}')
    })
  })
})

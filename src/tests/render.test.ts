import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, symlinkSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { defineComponent, h } from 'vue'
import { render } from '../render/index.ts'

function createTempProject() {
  const dir = mkdtempSync(join(tmpdir(), 'maizzle-render-'))
  return dir
}

function writeSfc(dir: string, path: string, content: string) {
  const full = join(dir, path)
  mkdirSync(join(dir, ...path.split('/').slice(0, -1)), { recursive: true })
  writeFileSync(full, content)
}

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

  describe('raw SFC source', () => {
    it('renders a simple template', async () => {
      const result = await render(`
        <template>
          <div>Hello World</div>
        </template>
      `)

      expect(result.html).toContain('Hello World')
      expect(result.html).toContain('<div>')
      expect(result.html).not.toContain('<template>')
    })

    it('renders expressions', async () => {
      const result = await render(`
        <template>
          <div>{{ 1 + 1 }}</div>
        </template>
      `)

      expect(result.html).toContain('2')
    })

    it('renders script setup variables', async () => {
      const result = await render(`
        <script setup>
        const name = 'Maizzle'
        </script>
        <template>
          <div>{{ name }}</div>
        </template>
      `)

      expect(result.html).toContain('<div>Maizzle</div>')
    })
  })

  describe('file path', () => {
    it('renders a .vue file from disk', async () => {
      writeSfc(tempDir, 'emails/test.vue', `
        <template>
          <div>From File</div>
        </template>
      `)

      const result = await render(join(tempDir, 'emails/test.vue'))

      expect(result.html).toContain('From File')
    })
  })

  describe('return value', () => {
    it('returns html and config', async () => {
      const result = await render(`
        <template>
          <div>Test</div>
        </template>
      `)

      expect(result).toHaveProperty('html')
      expect(result).toHaveProperty('config')
      expect(typeof result.html).toBe('string')
      expect(typeof result.config).toBe('object')
    })

    it('config contains defaults', async () => {
      const result = await render(`
        <template>
          <div>Test</div>
        </template>
      `)

      expect(result.config.content).toEqual([resolve(tempDir, 'emails/**/*.{vue,md}').replace(/\\/g, '/')])
      expect(result.config.css?.inline).toBe(true)
      expect(result.config.css?.purge).toBe(true)
      expect(result.config.css?.shorthand).toBe(true)
      expect(result.config.html?.format).toBe(true)
    })
  })

  describe('doctype', () => {
    it('prepends default doctype', async () => {
      const result = await render(`
        <template>
          <div>Test</div>
        </template>
      `)

      expect(result.html).toMatch(/^<!DOCTYPE html>\n/)
    })

    it('uses custom doctype from config', async () => {
      const result = await render(`
        <template>
          <div>Test</div>
        </template>
      `, {
        doctype: '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">',
      })

      expect(result.html).toMatch(/^<!DOCTYPE html PUBLIC/)
      expect(result.html).not.toMatch(/^<!DOCTYPE html>\n/)
    })

    it('uses useDoctype() from SFC', async () => {
      const result = await render(`
        <script setup>
        useDoctype('<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN">')
        </script>
        <template>
          <div>Test</div>
        </template>
      `)

      expect(result.html).toMatch(/^<!DOCTYPE html PUBLIC "-\/\/W3C\/\/DTD HTML 4\.01 Transitional\/\/EN">/)
    })

    it('useDoctype() takes priority over config doctype', async () => {
      const result = await render(`
        <script setup>
        useDoctype('<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01//EN">')
        </script>
        <template>
          <div>Test</div>
        </template>
      `, {
        doctype: '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0//EN">',
      })

      expect(result.html).toMatch(/^<!DOCTYPE html PUBLIC "-\/\/W3C\/\/DTD HTML 4\.01\/\/EN">/)
    })
  })

  describe('config', () => {
    it('merges programmatic config with defaults', async () => {
      const result = await render(`
        <template>
          <div>Test</div>
        </template>
      `, {
        css: { safe: false },
      })

      expect(result.config.css?.safe).toBe(false)
      // Defaults still present
      expect(result.config.css?.preferUnitless).toBe(true)
    })

    it('uses template-level defineConfig()', async () => {
      const result = await render(`
        <script setup>
        defineConfig({
          css: { inline: true },
        })
        </script>
        <template>
          <div>Test</div>
        </template>
      `)

      expect(result.config.css?.inline).toBe(true)
    })

    it('template defineConfig() merges on top of global config', async () => {
      const result = await render(`
        <script setup>
        defineConfig({
          css: { shorthand: true },
        })
        </script>
        <template>
          <div>Test</div>
        </template>
      `, {
        css: { inline: true },
      })

      expect(result.config.css?.shorthand).toBe(true)
      expect(result.config.css?.inline).toBe(true)
    })
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
      // Only one <style> block from <Tailwind> (no duplication from a
      // nested inner block compiling separately)
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

    it('skips only inlineCSS when useTransformers is given a granular toggle', async () => {
      const result = await render(`
        <script setup>
        defineConfig({
          useTransformers: { inlineCSS: false },
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

      // inlineCSS skipped → class stays on the div, rule stays inside <style>
      expect(result.html).toContain('class="test"')
      expect(result.html).toMatch(/<style[^>]*>[\s\S]*\.test[\s\S]*color:\s*red[\s\S]*<\/style>/)
      expect(result.html).not.toMatch(/style="[^"]*color:\s*red/)
    })

    it('useTransformers({ ... }) preserves config defaults instead of replacing them', async () => {
      // Repro for: SFC calling useTransformers with a partial override
      // would drop defaults like css.inline / css.purge, because sfcConfig
      // replaced the resolved config wholesale. Renderer must merge.
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
        useTransformers({ inlineCSS: false })
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

  describe('Vue features', () => {
    it('renders v-for loops', async () => {
      const result = await render(`
        <script setup>
        const items = ['one', 'two', 'three']
        </script>
        <template>
          <ul>
            <li v-for="item in items" :key="item">{{ item }}</li>
          </ul>
        </template>
      `)

      expect(result.html).toContain('one')
      expect(result.html).toContain('two')
      expect(result.html).toContain('three')
    })

    it('renders slots with default content', async () => {
      const result = await render(`
        <template>
          <div>
            <slot>Default Content</slot>
          </div>
        </template>
      `)

      expect(result.html).toContain('Default Content')
    })
  })

  describe('edge cases', () => {
    it('handles empty template', async () => {
      const result = await render(`
        <template>
          <div></div>
        </template>
      `)

      expect(result.html).toContain('<div></div>')
      expect(result.html).not.toContain('<template>')
    })

    it('handles template with only text', async () => {
      const result = await render(`
        <template>
          Just text
        </template>
      `)

      expect(result.html).toContain('Just text')
      expect(result.html).not.toContain('<template>')
    })

    it('strips Vue SSR comments', async () => {
      const result = await render(`
        <script setup>
        const items = ['a', 'b']
        </script>
        <template>
          <div>
            <span v-for="item in items" :key="item">{{ item }}</span>
          </div>
        </template>
      `)

      expect(result.html).not.toContain('<!--[-->')
      expect(result.html).not.toContain('<!--]-->')
    })

    it('handles multiple root elements', async () => {
      const result = await render(`
        <template>
          <div>First</div>
          <div>Second</div>
        </template>
      `)

      expect(result.html).toContain('<div>First</div>')
      expect(result.html).toContain('<div>Second</div>')
    })

    it('preserves content inside MSO conditional comments around Vue SSR fragment markers', async () => {
      // Vue SSR emits `<!--[-->`/`<!--]-->` fragment markers around slots.
      // Each contains `-->` which would prematurely terminate a surrounding
      // `<!--[if mso]>...<![endif]-->` if the markers reached htmlparser2.
      const result = await render(`
        <template>
          <Outlook open="<table><tr><td>" close="</td></tr></table>">
            INSIDE
          </Outlook>
        </template>
      `)

      expect(result.html).toContain('<!--[if mso]>')
      expect(result.html).toContain('<table>')
      expect(result.html).toContain('<tr>')
      expect(result.html).toContain('<td>')
      expect(result.html).toContain('INSIDE')
      expect(result.html).toContain('</td>')
      expect(result.html).toContain('</tr>')
      expect(result.html).toContain('</table>')
      expect(result.html).toContain('<![endif]-->')
      expect(result.html).not.toContain('<!--[-->')
      expect(result.html).not.toContain('<!--]-->')

      const openIdx = result.html.indexOf('<!--[if mso]>')
      const closeIdx = result.html.indexOf('<![endif]-->')
      const tableOpenIdx = result.html.indexOf('<table>')
      const tableCloseIdx = result.html.indexOf('</table>')
      expect(tableOpenIdx).toBeGreaterThan(openIdx)
      expect(tableCloseIdx).toBeGreaterThan(tableOpenIdx)
      expect(closeIdx).toBeGreaterThan(tableCloseIdx)
    })
  })

  describe('teleport', () => {
    it('teleports content to head', async () => {
      const result = await render(`
        <template>
          <html>
            <head></head>
            <body>
              <Teleport to="head">
                <style>h1 { color: red }</style>
              </Teleport>
              <h1>Hello</h1>
            </body>
          </html>
        </template>
      `, { useTransformers: false })

      // Vue SSR places teleported content in the target with anchor comments,
      // which are stripped by the transformer pipeline
      expect(result.html).toContain('color: red')
      expect(result.html).toContain('<h1>Hello</h1>')
      // No teleport anchor comments in output
      expect(result.html).not.toContain('<!--teleport')
    })

    it('teleports content to body (appends by default)', async () => {
      const result = await render(`
        <template>
          <html>
            <head></head>
            <body>
              <Teleport to="body">
                <img src="tracking.gif">
              </Teleport>
              <h1>Hello</h1>
            </body>
          </html>
        </template>
      `)

      expect(result.html).toContain('<h1>Hello</h1>')
      expect(result.html).toContain('src="tracking.gif"')
      // Teleported img should be after h1 (appended to body)
      const bodyContent = result.html.match(/<body>([\s\S]*?)<\/body>/)?.[1] ?? ''
      expect(bodyContent.indexOf('<h1>')).toBeLessThan(bodyContent.indexOf('tracking.gif'))
    })

    it('teleports to body:start prepends content', async () => {
      const result = await render(`
        <template>
          <html>
            <head></head>
            <body>
              <Teleport to="body:start">
                <div class="preheader">Preview text</div>
              </Teleport>
              <h1>Hello</h1>
            </body>
          </html>
        </template>
      `)

      expect(result.html).toContain('Preview text')
      // Preheader should come before h1 in body
      const bodyContent = result.html.match(/<body>([\s\S]*?)<\/body>/)?.[1] ?? ''
      expect(bodyContent.indexOf('preheader')).toBeLessThan(bodyContent.indexOf('<h1>'))
    })

    it('teleports to element by id', async () => {
      const result = await render(`
        <template>
          <html>
            <head></head>
            <body>
              <Teleport to="#footer">
                <p>Footer content</p>
              </Teleport>
              <h1>Hello</h1>
              <div id="footer"></div>
            </body>
          </html>
        </template>
      `)

      expect(result.html).toContain('Footer content')
      expect(result.html).toContain('id="footer"')
      // Content should be inside the footer div
      expect(result.html).toMatch(/<div id="footer">.*Footer content.*<\/div>/)
    })

    it('teleports to element by class', async () => {
      const result = await render(`
        <template>
          <html>
            <head></head>
            <body>
              <Teleport to=".sidebar">
                <p>Sidebar content</p>
              </Teleport>
              <h1>Hello</h1>
              <div class="sidebar"></div>
            </body>
          </html>
        </template>
      `, { useTransformers: false })

      expect(result.html).toContain('Sidebar content')
      expect(result.html).toMatch(/<div class="sidebar">.*Sidebar content.*<\/div>/)
    })

    it('supports :start for arbitrary targets', async () => {
      const result = await render(`
        <template>
          <html>
            <head></head>
            <body>
              <Teleport to="#wrapper:start">
                <div class="preheader">Preview</div>
              </Teleport>
              <div id="wrapper">
                <h1>Hello</h1>
              </div>
            </body>
          </html>
        </template>
      `)

      // Preheader should be inside wrapper, before h1
      const wrapper = result.html.match(/<div id="wrapper">([\s\S]*)<\/div>/)?.[1] ?? ''
      expect(wrapper).toContain('Preview')
      expect(wrapper.indexOf('preheader')).toBeLessThan(wrapper.indexOf('<h1>'))
    })

    it('strips all teleport anchor comments', async () => {
      const result = await render(`
        <template>
          <html>
            <head></head>
            <body>
              <Teleport to="head">
                <meta name="test" content="value">
              </Teleport>
              <h1>Hello</h1>
            </body>
          </html>
        </template>
      `)

      expect(result.html).not.toContain('<!--teleport start anchor-->')
      expect(result.html).not.toContain('<!--teleport anchor-->')
      expect(result.html).not.toContain('<!--teleport start-->')
      expect(result.html).not.toContain('<!--teleport end-->')
    })
  })

  describe('self-closing tags', () => {
    it('omits trailing slash for HTML5 doctype (default)', async () => {
      const result = await render(`
        <template>
          <html>
            <head></head>
            <body>
              <br>
              <img src="test.jpg">
            </body>
          </html>
        </template>
      `)

      expect(result.html).toContain('<br>')
      expect(result.html).not.toContain('<br />')
      expect(result.html).not.toContain('/>')
    })

    it('adds trailing slash for XHTML doctype', async () => {
      const result = await render(`
        <script setup>
        useDoctype('<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">')
        </script>
        <template>
          <html>
            <head></head>
            <body>
              <br>
              <img src="test.jpg">
            </body>
          </html>
        </template>
      `)

      expect(result.html).toContain('<br />')
      expect(result.html).toMatch(/<img [^>]*\/>/)
    })

    it('adds trailing slash for XHTML doctype from config', async () => {
      const result = await render(`
        <template>
          <html>
            <head></head>
            <body>
              <hr>
            </body>
          </html>
        </template>
      `, {
        doctype: '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">',
      })

      expect(result.html).toContain('<hr />')
    })

    it('preserves trailing slash for XHTML even with format enabled', async () => {
      const result = await render(`
        <template>
          <html>
            <head></head>
            <body>
              <br>
              <img src="test.jpg">
            </body>
          </html>
        </template>
      `, {
        doctype: '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">',
        html: { format: true },
      })

      expect(result.html).toContain('<br />')
      expect(result.html).toMatch(/<img [^>]*\/>/)
    })

    it('strips trailing slash for HTML5 even with format enabled', async () => {
      const result = await render(`
        <template>
          <html>
            <head></head>
            <body>
              <br>
              <img src="test.jpg">
            </body>
          </html>
        </template>
      `, {
        html: { format: true },
      })

      expect(result.html).not.toContain('/>')
    })
  })

  describe('components.source', () => {
    it('auto-imports components from custom dirs', async () => {
      writeSfc(tempDir, 'custom-components/MyButton.vue', `
        <template>
          <a href="#">Click me</a>
        </template>
      `)

      const result = await render(`
        <template>
          <div><MyButton /></div>
        </template>
      `, {
        root: tempDir,
        components: { source: ['custom-components'] },
      })

      expect(result.html).toContain('Click me')
      expect(result.html).toContain('<a href="#">')
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

    it('passes strip options from config object', async () => {
      const result = await render(`
        <template>
          <div>Hello</div><br/>World
        </template>
      `, { plaintext: { ignoreTags: ['br'] } })

      expect(result.plaintext).toContain('<br>')
    })
  })

  describe('component input', () => {
    it('renders an imported Vue component', async () => {
      const EmailComponent = defineComponent({
        render() {
          return h('html', [
            h('head'),
            h('body', [
              h('div', 'Hello from component'),
            ]),
          ])
        },
      })

      const result = await render(EmailComponent)

      expect(result.html).toContain('<div>Hello from component</div>')
    })

    it('applies transformers to component output', async () => {
      const EmailComponent = defineComponent({
        render() {
          return h('html', [
            h('head'),
            h('body', [
              h('div', { style: 'padding: 10px 20px 10px 20px' }, 'Test'),
            ]),
          ])
        },
      })

      const result = await render(EmailComponent, { css: { shorthand: true } })

      expect(result.html).toContain('padding: 10px 20px')
    })

    it('compiles Tailwind CSS utilities', async () => {
      symlinkSync(join(originalCwd, 'node_modules'), join(tempDir, 'node_modules'))

      const EmailComponent = defineComponent({
        render() {
          return h('html', [
            h('head', [
              h('style', '@import "tailwindcss/utilities" important;'),
            ]),
            h('body', [
              h('div', { class: '[color:red]' }, 'Test'),
            ]),
          ])
        },
      })

      const result = await render(EmailComponent)

      expect(result.html).toContain('color: red')
    })

    it('prepends doctype', async () => {
      const EmailComponent = defineComponent({
        render() {
          return h('html', [h('head'), h('body')])
        },
      })

      const result = await render(EmailComponent)

      expect(result.html.startsWith('<!DOCTYPE html>')).toBe(true)
    })
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

  describe('custom vite config', () => {
    it('accepts user plugins via config.vite', async () => {
      let pluginCalled = false

      const result = await render(`
        <template>
          <div>With Plugin</div>
        </template>
      `, {
        vite: {
          plugins: [{
            name: 'test-plugin',
            configResolved() {
              pluginCalled = true
            },
          }],
        },
      })

      expect(result.html).toContain('With Plugin')
      expect(pluginCalled).toBe(true)
    })

    it('user plugin can transform template content', async () => {
      const result = await render(`
        <template>
          <div>REPLACE_ME</div>
        </template>
      `, {
        vite: {
          plugins: [{
            name: 'test-transform-plugin',
            transform(code: string, id: string) {
              if (id.endsWith('.vue') && code.includes('REPLACE_ME')) {
                return code.replace('REPLACE_ME', 'Transformed')
              }
            },
          }],
        },
      })

      expect(result.html).toContain('Transformed')
      expect(result.html).not.toContain('REPLACE_ME')
    })

    it('loads vite.config.ts from project root when present', async () => {
      writeFileSync(join(tempDir, 'vite.config.ts'), `
        export default {
          define: {
            __VITE_CONFIG_LOADED__: JSON.stringify('yes'),
          },
        }
      `)

      const result = await render(`
        <script setup>
        const loaded = typeof __VITE_CONFIG_LOADED__ !== 'undefined' ? __VITE_CONFIG_LOADED__ : 'no'
        </script>
        <template>
          <div>{{ loaded }}</div>
        </template>
      `, {
        root: tempDir,
      })

      expect(result.html).toContain('yes')
    })

    it('loads vite.config.js from project root when present', async () => {
      writeFileSync(join(tempDir, 'vite.config.js'), `
        export default {
          define: {
            __VITE_JS_CONFIG__: JSON.stringify('loaded'),
          },
        }
      `)

      const result = await render(`
        <script setup>
        const val = typeof __VITE_JS_CONFIG__ !== 'undefined' ? __VITE_JS_CONFIG__ : 'not loaded'
        </script>
        <template>
          <div>{{ val }}</div>
        </template>
      `, {
        root: tempDir,
      })

      expect(result.html).toContain('loaded')
    })

    it('uses config.vite as fallback when no vite.config file exists', async () => {
      let pluginRan = false

      const result = await render(`
        <template>
          <div>Fallback</div>
        </template>
      `, {
        vite: {
          plugins: [{
            name: 'fallback-plugin',
            configResolved() {
              pluginRan = true
            },
          }],
        },
      })

      expect(result.html).toContain('Fallback')
      expect(pluginRan).toBe(true)
    })

    it('ignores config.vite when vite.config file exists', async () => {
      let inlinePluginCalled = false

      writeFileSync(join(tempDir, 'vite.config.ts'), `
        export default {
          define: {
            __FROM_FILE__: JSON.stringify('file'),
          },
        }
      `)

      const result = await render(`
        <script setup>
        const source = typeof __FROM_FILE__ !== 'undefined' ? __FROM_FILE__ : 'inline'
        </script>
        <template>
          <div>{{ source }}</div>
        </template>
      `, {
        root: tempDir,
        vite: {
          plugins: [{
            name: 'inline-plugin',
            configResolved() {
              inlinePluginCalled = true
            },
          }],
        },
      })

      // File config loaded
      expect(result.html).toContain('file')
      // Inline config.vite plugins NOT merged when file exists
      expect(inlinePluginCalled).toBe(false)
    })
  })

  describe('vue config', () => {
    it('registers Vue plugins on the app', async () => {
      let installCalled = false

      const result = await render(`
        <template>
          <div>With Plugin</div>
        </template>
      `, {
        vue: {
          plugins: [{
            install(app: any) {
              installCalled = true
              app.config.globalProperties.$pluginValue = 'from-plugin'
            },
          }],
        },
      })

      expect(result.html).toContain('With Plugin')
      expect(installCalled).toBe(true)
    })

    it('plugin global properties are accessible in templates', async () => {
      const result = await render(`
        <template>
          <div>{{ $greeting }}</div>
        </template>
      `, {
        vue: {
          plugins: [{
            install(app: any) {
              app.config.globalProperties.$greeting = 'Hello from plugin'
            },
          }],
        },
      })

      expect(result.html).toContain('Hello from plugin')
    })

    it('registers custom directives', async () => {
      const result = await render(`
        <template>
          <div v-test-dir>Content</div>
        </template>
      `, {
        vue: {
          directives: {
            'test-dir': {
              getSSRProps() {
                return { 'data-directed': 'true' }
              },
            },
          },
        },
      })

      expect(result.html).toContain('data-directed="true"')
    })

    it('adds global properties accessible in templates', async () => {
      const result = await render(`
        <template>
          <div>{{ $brand }}</div>
        </template>
      `, {
        vue: {
          globalProperties: {
            $brand: 'Maizzle',
          },
        },
      })

      expect(result.html).toContain('Maizzle')
    })

    it('global properties can be functions', async () => {
      const result = await render(`
        <template>
          <div>{{ $format('hello') }}</div>
        </template>
      `, {
        vue: {
          globalProperties: {
            $format: (s: string) => s.toUpperCase(),
          },
        },
      })

      expect(result.html).toContain('HELLO')
    })

    it('combines plugins, directives, and globalProperties', async () => {
      let pluginInstalled = false

      const result = await render(`
        <template>
          <div v-mark>{{ $label }}</div>
        </template>
      `, {
        vue: {
          plugins: [{
            install() {
              pluginInstalled = true
            },
          }],
          directives: {
            mark: {
              getSSRProps() {
                return { 'data-marked': '' }
              },
            },
          },
          globalProperties: {
            $label: 'Everything works',
          },
        },
      })

      expect(pluginInstalled).toBe(true)
      expect(result.html).toContain('data-marked')
      expect(result.html).toContain('Everything works')
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

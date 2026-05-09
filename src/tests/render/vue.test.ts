import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { rmSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { render } from '../../render/index.ts'
import { createRenderer } from '../../render/createRenderer.ts'
import { normalizeComponentSources } from '../../utils/componentSources.ts'
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

    it('namespaces nested components by folder so identical names dont collide', async () => {
      writeSfc(tempDir, 'components/card/Header.vue', `
        <template><div class="card-header">Card</div></template>
      `)
      writeSfc(tempDir, 'components/alert/Header.vue', `
        <template><div class="alert-header">Alert</div></template>
      `)

      const result = await render(`
        <template>
          <div>
            <CardHeader />
            <AlertHeader />
          </div>
        </template>
      `, { root: tempDir })

      expect(result.html).toContain('class="card-header"')
      expect(result.html).toContain('class="alert-header"')
    })

    it('collapses same-prefix when filename already starts with folder name', async () => {
      writeSfc(tempDir, 'components/card/CardFooter.vue', `
        <template><div class="card-footer">Footer</div></template>
      `)

      const result = await render(`
        <template><CardFooter /></template>
      `, { root: tempDir })

      expect(result.html).toContain('class="card-footer"')
    })

    it('supports object source with custom prefix', async () => {
      writeSfc(tempDir, 'widgets/Button.vue', `
        <template><button class="w-btn">Buy</button></template>
      `)

      const result = await render(`
        <template><WButton /></template>
      `, {
        root: tempDir,
        components: { source: [{ path: 'widgets', prefix: 'W' }] },
      })

      expect(result.html).toContain('class="w-btn"')
    })

    it('respects pathPrefix: false to flatten nested folders', async () => {
      writeSfc(tempDir, 'icons/social/Twitter.vue', `
        <template><svg class="i-twitter"></svg></template>
      `)
      writeSfc(tempDir, 'icons/ui/Chevron.vue', `
        <template><svg class="i-chevron"></svg></template>
      `)

      const result = await render(`
        <template>
          <div>
            <IconTwitter />
            <IconChevron />
          </div>
        </template>
      `, {
        root: tempDir,
        components: { source: [{ path: 'icons', prefix: 'Icon', pathPrefix: false }] },
      })

      expect(result.html).toContain('class="i-twitter"')
      expect(result.html).toContain('class="i-chevron"')
    })

    it('emits a prefixed-components.d.ts with all prefixed entries when dts: true', async () => {
      writeSfc(tempDir, 'customs/card/Header.vue', '<template><div /></template>')
      writeSfc(tempDir, 'customs/alert/Header.vue', '<template><div /></template>')

      const renderer = await createRenderer({
        dts: true,
        root: tempDir,
        componentDirs: normalizeComponentSources(
          [{ path: 'customs', prefix: 'Custom' }],
          tempDir,
        ),
      })

      try {
        const dtsPath = join(tempDir, '.maizzle/prefixed-components.d.ts')
        expect(existsSync(dtsPath)).toBe(true)

        const content = readFileSync(dtsPath, 'utf-8')
        expect(content).toContain(`export interface GlobalComponents`)
        expect(content).toContain(`/* prettier-ignore */`)
        expect(content).toMatch(/CustomCardHeader: typeof import\('\.\.\/customs\/card\/Header\.vue'\)\['default'\]/)
        expect(content).toMatch(/CustomAlertHeader: typeof import\('\.\.\/customs\/alert\/Header\.vue'\)\['default'\]/)
      } finally {
        await renderer.close()
      }
    })

    it('user component overrides a built-in with the same name', async () => {
      // Heading is a built-in framework component; the user's local one
      // should win without any "naming conflict" warning surfacing.
      writeSfc(tempDir, 'components/Heading.vue', `
        <template><span class="user-heading">override</span></template>
      `)

      const warn = console.warn
      const captured: string[] = []
      console.warn = (...args: any[]) => { captured.push(args.join(' ')) }

      try {
        const result = await render(`<template><Heading /></template>`, { root: tempDir })
        expect(result.html).toContain('class="user-heading"')
        expect(result.html).toContain('override')
        expect(captured.join('\n')).not.toMatch(/naming conflicts/)
      } finally {
        console.warn = warn
      }
    })

    it('throws on name collision when pathPrefix: false flattens conflicting filenames', async () => {
      writeSfc(tempDir, 'icons/social/Twitter.vue', '<template><svg /></template>')
      writeSfc(tempDir, 'icons/brand/Twitter.vue', '<template><svg /></template>')

      await expect(createRenderer({
        root: tempDir,
        componentDirs: normalizeComponentSources(
          [{ path: 'icons', prefix: 'Icon', pathPrefix: false }],
          tempDir,
        ),
      })).rejects.toThrow(/Component name collision: "IconTwitter"/)
    })

    it('removes a stale prefixed d.ts when no prefixed sources are configured', async () => {
      // Seed a leftover file as if a previous run had prefixed sources.
      writeSfc(tempDir, '.maizzle/prefixed-components.d.ts', 'stale')

      const renderer = await createRenderer({
        dts: true,
        root: tempDir,
        componentDirs: [],
      })

      try {
        expect(existsSync(join(tempDir, '.maizzle/prefixed-components.d.ts'))).toBe(false)
      } finally {
        await renderer.close()
      }
    })
  })
})

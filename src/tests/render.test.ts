import { describe, it, expect, beforeEach, afterEach } from 'vitest'
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
      expect(result.config.css?.inline).toBe(undefined)
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
        config: {
          doctype: '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">',
        },
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
        config: {
          doctype: '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0//EN">',
        },
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
        config: {
          css: { resolveCalc: false },
        },
      })

      expect(result.config.css?.resolveCalc).toBe(false)
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
        config: {
          css: { inline: true },
        },
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
        config: {
          css: { inline: true },
        },
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
        config: {
          replaceStrings: { '{name}': 'World' },
        },
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
  })

  describe('plaintext', () => {
    it('returns plaintext when config.plaintext is true', async () => {
      const result = await render(`
        <template>
          <div><h1>Hello</h1><p>World</p></div>
        </template>
      `, {
        config: { plaintext: true },
      })

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
      `, {
        config: { plaintext: { ignoreTags: ['br'] } },
      })

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

      const result = await render(EmailComponent, {
        config: { css: { shorthand: true } },
      })

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
})

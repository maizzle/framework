import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { rmSync, symlinkSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { defineComponent, h } from 'vue'
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

    it('omits doctype when config doctype is false', async () => {
      const result = await render(`
        <template>
          <div>Test</div>
        </template>
      `, {
        doctype: false,
      })

      expect(result.html).not.toMatch(/doctype/i)
      expect(result.html.startsWith('\n')).toBe(false)
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

    it('uses doctype prop on Html component', async () => {
      const result = await render(`
        <template>
          <Html doctype='<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN">'>
            <Body>
              <div>Test</div>
            </Body>
          </Html>
        </template>
      `)

      expect(result.html).toMatch(/^<!DOCTYPE html PUBLIC "-\/\/W3C\/\/DTD HTML 4\.01 Transitional\/\/EN">/)
    })

    it('Html doctype prop overrides config doctype', async () => {
      const result = await render(`
        <template>
          <Html doctype='<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01//EN">'>
            <Body>
              <div>Test</div>
            </Body>
          </Html>
        </template>
      `, {
        doctype: '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0//EN">',
      })

      expect(result.html).toMatch(/^<!DOCTYPE html PUBLIC "-\/\/W3C\/\/DTD HTML 4\.01\/\/EN">/)
    })

    it('Html doctype prop overrides useDoctype()', async () => {
      const result = await render(`
        <script setup>
        useDoctype('<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0//EN">')
        </script>
        <template>
          <Html doctype='<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01//EN">'>
            <Body>
              <div>Test</div>
            </Body>
          </Html>
        </template>
      `)

      expect(result.html).toMatch(/^<!DOCTYPE html PUBLIC "-\/\/W3C\/\/DTD HTML 4\.01\/\/EN">/)
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

  describe('invalid input', () => {
    it('throws a helpful error when given null', async () => {
      await expect(render(null as any)).rejects.toThrow(/render\(\) received null/)
    })

    it('throws a helpful error when given undefined', async () => {
      await expect(render(undefined as any)).rejects.toThrow(/render\(\) received undefined/)
    })

    it('throws a TypeError for a non-string/object/function input', async () => {
      await expect(render(123 as any)).rejects.toThrow(TypeError)
      await expect(render(123 as any)).rejects.toThrow(/expected a file path or SFC source/)
    })
  })
})

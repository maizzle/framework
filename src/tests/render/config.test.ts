import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
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

    it('does not autoload vite.config.ts from project root', async () => {
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

      expect(result.html).toContain('no')
    })

    it('does not autoload vite.config.js from project root', async () => {
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

      expect(result.html).toContain('not loaded')
    })

    it('uses config.vite plugins for SSR', async () => {
      let pluginRan = false

      const result = await render(`
        <template>
          <div>Inline</div>
        </template>
      `, {
        vite: {
          plugins: [{
            name: 'inline-plugin',
            configResolved() {
              pluginRan = true
            },
          }],
        },
      })

      expect(result.html).toContain('Inline')
      expect(pluginRan).toBe(true)
    })

    it('uses config.vite even when a vite.config file exists in project root', async () => {
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

      // File config NOT loaded (host vite.config.ts is never autoloaded)
      expect(result.html).toContain('inline')
      // Inline config.vite plugins always run
      expect(inlinePluginCalled).toBe(true)
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
})

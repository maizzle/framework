import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, writeFileSync, readFileSync, existsSync, mkdirSync, rmSync, symlinkSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { build } from '../build.ts'

function createTempProject() {
  const dir = mkdtempSync(join(tmpdir(), 'maizzle-build-'))
  return dir
}

function writeSfc(dir: string, path: string, content: string) {
  const full = join(dir, path)
  mkdirSync(join(dir, ...path.split('/').slice(0, -1)), { recursive: true })
  writeFileSync(full, content)
}

describe('build', () => {
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

  it('builds a simple SFC to HTML', async () => {
    writeSfc(tempDir, 'emails/welcome.vue', `
      <template>
        <div>Hello World</div>
      </template>
    `)

    const result = await build()

    expect(result.files).toHaveLength(1)
    expect(result.files[0]).toContain('welcome.html')

    const html = readFileSync(result.files[0], 'utf-8')
    expect(html).toContain('Hello World')
  })

  it('respects output.path config', async () => {
    writeSfc(tempDir, 'emails/test.vue', `
      <template>
        <p>Test</p>
      </template>
    `)

    writeFileSync(join(tempDir, 'maizzle.config.js'), `
      export default {
        output: { path: 'dist' }
      }
    `)

    const result = await build()

    expect(result.files[0]).toContain('/dist/')
  })

  it('respects output.extension config', async () => {
    writeSfc(tempDir, 'emails/test.vue', `
      <template>
        <p>Test</p>
      </template>
    `)

    writeFileSync(join(tempDir, 'maizzle.config.js'), `
      export default {
        output: { extension: 'htm' }
      }
    `)

    const result = await build()

    expect(result.files[0]).toMatch(/\.htm$/)
  })

  it('supports output override via config', async () => {
    writeSfc(tempDir, 'emails/test.vue', `
      <template>
        <p>Test</p>
      </template>
    `)

    const result = await build({ output: { path: join(tempDir, 'custom-output') } })

    expect(result.files[0]).toContain('custom-output')
  })

  it('builds multiple templates', async () => {
    writeSfc(tempDir, 'emails/one.vue', `
      <template><div>One</div></template>
    `)

    writeSfc(tempDir, 'emails/two.vue', `
      <template><div>Two</div></template>
    `)

    const result = await build()

    expect(result.files).toHaveLength(2)

    const htmls = result.files.map(f => readFileSync(f, 'utf-8'))
    expect(htmls.some(h => h.includes('One'))).toBe(true)
    expect(htmls.some(h => h.includes('Two'))).toBe(true)
  })

  it('returns empty files array when no templates found', async () => {
    // No emails directory, no templates
    const result = await build()

    expect(result.files).toHaveLength(0)
  })

  it('fires beforeRender event', async () => {
    writeSfc(tempDir, 'emails/test.vue', `
      <template>
        <div>Hello</div>
      </template>
    `)

    writeFileSync(join(tempDir, 'maizzle.config.js'), `
      export default {
        beforeRender({ template, config }) {
          globalThis.__beforeRenderFired = {
            source: template.source,
            name: template.path.name,
            ext: template.path.ext,
            hasConfig: !!config,
          }
        }
      }
    `)

    await build()

    const data = (globalThis as any).__beforeRenderFired
    expect(data).toBeDefined()
    expect(data.source).toContain('Hello')
    expect(data.name).toBe('test')
    expect(data.ext).toBe('.vue')
    expect(data.hasConfig).toBe(true)
    delete (globalThis as any).__beforeRenderFired
  })

  it('fires afterRender event and uses modified HTML', async () => {
    writeSfc(tempDir, 'emails/test.vue', `
      <template>
        <div>Original</div>
      </template>
    `)

    writeFileSync(join(tempDir, 'maizzle.config.js'), `
      export default {
        afterRender({ html }) {
          return html.replace('Original', 'Modified')
        }
      }
    `)

    const result = await build()
    const html = readFileSync(result.files[0], 'utf-8')

    expect(html).toContain('Modified')
    expect(html).not.toContain('Original')
  })

  it('fires afterTransform event', async () => {
    writeSfc(tempDir, 'emails/test.vue', `
      <template>
        <div>Content</div>
      </template>
    `)

    writeFileSync(join(tempDir, 'maizzle.config.js'), `
      export default {
        afterTransform({ html }) {
          return html + '<!-- transformed -->'
        }
      }
    `)

    const result = await build()
    const html = readFileSync(result.files[0], 'utf-8')

    expect(html).toContain('<!-- transformed -->')
  })

  it('fires afterBuild event with file list', async () => {
    writeSfc(tempDir, 'emails/test.vue', `
      <template><div>Test</div></template>
    `)

    const marker = join(tempDir, 'afterbuild.marker')

    writeFileSync(join(tempDir, 'maizzle.config.js'), `
      import { writeFileSync } from 'node:fs'

      export default {
        afterBuild({ files }) {
          writeFileSync('${marker.replace(/\\/g, '\\\\')}', files.join('\\n'))
        }
      }
    `)

    await build()

    expect(existsSync(marker)).toBe(true)
    const content = readFileSync(marker, 'utf-8')
    expect(content).toContain('test.html')
  })

  it('fires beforeCreate to modify config', async () => {
    writeSfc(tempDir, 'emails/test.vue', `
      <template>
        <div>Test</div>
      </template>
    `)

    writeFileSync(join(tempDir, 'maizzle.config.js'), `
      export default {
        output: { path: 'original-output' },
        beforeCreate({ config }) {
          config.output.path = 'modified-output'
        }
      }
    `)

    const result = await build()

    expect(result.files[0]).toContain('modified-output')
  })

  it('does not leak Tailwind classes between templates', async () => {
    symlinkSync(join(originalCwd, 'node_modules'), join(tempDir, 'node_modules'))

    const sfc = `
      <template>
        <html>
          <head>
            <style>@import "tailwindcss/utilities" important;</style>
          </head>
          <body>
            <div class="[border:1px_solid_red]"></div>
          </body>
        </html>
      </template>
    `

    writeSfc(tempDir, 'emails/first.vue', sfc)
    writeSfc(tempDir, 'emails/nested/second.vue', sfc)

    const result = await build()
    const htmls = result.files.map(f => readFileSync(f, 'utf-8'))

    // Both should contain the arbitrary value class compiled to CSS
    for (const html of htmls) {
      expect(html).toContain('border: 1px solid red')
    }

    // Neither should have a leaked .border utility class
    for (const html of htmls) {
      expect(html).not.toMatch(/\.border\s*\{/)
    }
  })

  describe('plaintext', () => {
    it('generates .txt file alongside HTML with plaintext: true', async () => {
      writeSfc(tempDir, 'emails/welcome.vue', `
        <template>
          <div><h1>Hello</h1><p>World</p></div>
        </template>
      `)

      const result = await build({ plaintext: true })

      expect(result.files).toHaveLength(1)

      const txtPath = result.files[0].replace(/\.html$/, '.txt')
      expect(existsSync(txtPath)).toBe(true)

      const txt = readFileSync(txtPath, 'utf-8')
      expect(txt).toContain('Hello')
      expect(txt).toContain('World')
      expect(txt).not.toContain('<div>')
    })

    it('outputs to custom destination directory', async () => {
      writeSfc(tempDir, 'emails/test.vue', `
        <template>
          <div>Hello</div>
        </template>
      `)

      const customPath = join(tempDir, 'plaintext-output')

      const result = await build({ plaintext: { destination: customPath } })

      expect(result.files).toHaveLength(1)
      expect(existsSync(join(customPath, 'test.txt'))).toBe(true)
    })

    it('passes options to string-strip-html via plaintext.options', async () => {
      writeSfc(tempDir, 'emails/test.vue', `
        <template>
          <div>Hello</div><br/>World
        </template>
      `)

      const result = await build({ plaintext: { options: { ignoreTags: ['br'] } } })

      const txtPath = result.files[0].replace(/\.html$/, '.txt')
      const txt = readFileSync(txtPath, 'utf-8')
      expect(txt).toContain('<br>')
    })

    it('uses custom extension from plaintext.extension', async () => {
      writeSfc(tempDir, 'emails/test.vue', `
        <template>
          <div>Hello</div>
        </template>
      `)

      const result = await build({ plaintext: { extension: 'text' } })

      const textPath = result.files[0].replace(/\.html$/, '.text')
      expect(existsSync(textPath)).toBe(true)
    })

    it('does not generate .txt without plaintext config', async () => {
      writeSfc(tempDir, 'emails/test.vue', `
        <template>
          <div>Hello</div>
        </template>
      `)

      const result = await build()

      const txtPath = result.files[0].replace(/\.html$/, '.txt')
      expect(existsSync(txtPath)).toBe(false)
    })

    it('generates plaintext via usePlaintext() in SFC', async () => {
      writeSfc(tempDir, 'emails/test.vue', `
        <script setup>
        usePlaintext()
        </script>
        <template>
          <div>Hello from SFC</div>
        </template>
      `)

      const result = await build()

      const txtPath = result.files[0].replace(/\.html$/, '.txt')
      expect(existsSync(txtPath)).toBe(true)

      const txt = readFileSync(txtPath, 'utf-8')
      expect(txt).toContain('Hello from SFC')
      expect(txt).not.toContain('<div>')
    })

    it('usePlaintext() with custom extension', async () => {
      writeSfc(tempDir, 'emails/test.vue', `
        <script setup>
        usePlaintext({ extension: 'text' })
        </script>
        <template>
          <div>Hello</div>
        </template>
      `)

      const result = await build()

      const textPath = result.files[0].replace(/\.html$/, '.text')
      expect(existsSync(textPath)).toBe(true)
    })

    it('usePlaintext() with custom destination', async () => {
      const customDest = join(tempDir, 'custom-txt')

      writeSfc(tempDir, 'emails/test.vue', `
        <script setup>
        usePlaintext({ destination: '${customDest.replace(/\\/g, '\\\\')}' })
        </script>
        <template>
          <div>Hello</div>
        </template>
      `)

      await build()

      expect(existsSync(join(customDest, 'test.txt'))).toBe(true)
    })

    it('only template with usePlaintext() gets plaintext generated', async () => {
      writeSfc(tempDir, 'emails/with-plaintext.vue', `
        <script setup>
        usePlaintext()
        </script>
        <template>
          <div>With Plaintext</div>
        </template>
      `)

      writeSfc(tempDir, 'emails/without-plaintext.vue', `
        <template>
          <div>Without Plaintext</div>
        </template>
      `)

      const result = await build()

      const withTxt = result.files.find(f => f.includes('with-plaintext'))!.replace(/\.html$/, '.txt')
      const withoutTxt = result.files.find(f => f.includes('without-plaintext'))!.replace(/\.html$/, '.txt')

      expect(existsSync(withTxt)).toBe(true)
      expect(existsSync(withoutTxt)).toBe(false)
    })
  })

  describe('useOutputPath', () => {
    it('writes HTML to the exact path, not the default structured path', async () => {
      writeSfc(tempDir, 'emails/welcome.vue', `
        <script setup>
        useOutputPath('dist/promos/welcome.html')
        </script>
        <template>
          <div>Hello</div>
        </template>
      `)

      const result = await build()

      expect(existsSync(join(tempDir, 'dist/promos/welcome.html'))).toBe(true)
      expect(existsSync(join(tempDir, 'dist/welcome.html'))).toBe(false)
      expect(result.files[0]).toContain(join('dist', 'promos', 'welcome.html'))
    })

    it('appends output.extension when the path has no extension', async () => {
      writeSfc(tempDir, 'emails/welcome.vue', `
        <script setup>
        useOutputPath('dist/promos/welcome')
        </script>
        <template>
          <div>Hello</div>
        </template>
      `)

      await build()

      expect(existsSync(join(tempDir, 'dist/promos/welcome.html'))).toBe(true)
    })

    it('writes the plaintext file next to the HTML output', async () => {
      writeSfc(tempDir, 'emails/welcome.vue', `
        <script setup>
        useOutputPath('dist/promos/welcome.html')
        usePlaintext()
        </script>
        <template>
          <div>Hello</div>
        </template>
      `)

      await build()

      expect(existsSync(join(tempDir, 'dist/promos/welcome.html'))).toBe(true)
      expect(existsSync(join(tempDir, 'dist/promos/welcome.txt'))).toBe(true)
    })

    it('usePlaintext({ destination }) overrides useOutputPath for the plaintext file', async () => {
      const customDest = join(tempDir, 'custom-txt')

      writeSfc(tempDir, 'emails/welcome.vue', `
        <script setup>
        useOutputPath('dist/promos/welcome.html')
        usePlaintext({ destination: '${customDest.replace(/\\/g, '\\\\')}' })
        </script>
        <template>
          <div>Hello</div>
        </template>
      `)

      await build()

      expect(existsSync(join(customDest, 'welcome.txt'))).toBe(true)
      expect(existsSync(join(tempDir, 'dist/promos/welcome.txt'))).toBe(false)
    })

    it('does not leak the output path to other templates', async () => {
      writeSfc(tempDir, 'emails/moved.vue', `
        <script setup>
        useOutputPath('dist/special/moved.html')
        </script>
        <template>
          <div>Moved</div>
        </template>
      `)

      writeSfc(tempDir, 'emails/normal.vue', `
        <template>
          <div>Normal</div>
        </template>
      `)

      await build()

      expect(existsSync(join(tempDir, 'dist/special/moved.html'))).toBe(true)
      expect(existsSync(join(tempDir, 'dist/normal.html'))).toBe(true)
      expect(existsSync(join(tempDir, 'dist/special/normal.html'))).toBe(false)
    })
  })

  it('copies static assets to output', async () => {
    writeSfc(tempDir, 'emails/test.vue', `
      <template><div>Test</div></template>
    `)

    mkdirSync(join(tempDir, 'public/images'), { recursive: true })
    writeFileSync(join(tempDir, 'public/images/logo.png'), 'fake-png-data')
    // Second file in the same directory exercises the existsSync(destDir) === true path.
    writeFileSync(join(tempDir, 'public/images/icon.png'), 'fake-icon-data')

    const result = await build({
      static: {
        source: [join(tempDir, 'public/**/*.*')],
      },
    })

    expect(result.files).toHaveLength(1)

    const outputDir = join(tempDir, 'dist')
    expect(existsSync(join(outputDir, 'public/images/logo.png'))).toBe(true)
    expect(existsSync(join(outputDir, 'public/images/icon.png'))).toBe(true)
    expect(readFileSync(join(outputDir, 'public/images/logo.png'), 'utf-8')).toBe('fake-png-data')
  })

  it('clears existing output directory before building', async () => {
    const outputDir = join(tempDir, 'dist')
    mkdirSync(outputDir, { recursive: true })
    writeFileSync(join(outputDir, 'stale.html'), 'old content')

    writeSfc(tempDir, 'emails/test.vue', `
      <template><div>Fresh</div></template>
    `)

    await build()

    expect(existsSync(join(outputDir, 'stale.html'))).toBe(false)
    expect(existsSync(join(outputDir, 'test.html'))).toBe(true)
  })

  it('registers SFC event handlers via useEvent()', async () => {
    const marker = join(tempDir, 'afterbuild.marker')

    writeSfc(tempDir, 'emails/test.vue', `
      <script setup>
      import { writeFileSync } from 'node:fs'
      useEvent('afterBuild', ({ files }) => {
        writeFileSync('${marker.replace(/\\/g, '\\\\')}', files.join('\\n'))
      })
      </script>
      <template><div>Test</div></template>
    `)

    await build()

    expect(existsSync(marker)).toBe(true)
    expect(readFileSync(marker, 'utf-8')).toContain('test.html')
  })

  it('SFC useEvent(afterRender) fires for the template that registers it', async () => {
    writeSfc(tempDir, 'emails/test.vue', `
      <script setup>
      useEvent('afterRender', ({ html }) => html.replace('FROM_SFC', 'AFTER_RENDER_RAN'))
      </script>
      <template><div>FROM_SFC</div></template>
    `)

    await build()

    const html = readFileSync(join(tempDir, 'dist/test.html'), 'utf-8')
    expect(html).toContain('AFTER_RENDER_RAN')
    expect(html).not.toContain('FROM_SFC')
  })

  it('SFC useEvent(afterTransform) fires for the template that registers it', async () => {
    writeSfc(tempDir, 'emails/test.vue', `
      <script setup>
      useEvent('afterTransform', ({ html }) => html.replace('FROM_SFC', 'AFTER_TRANSFORM_RAN'))
      </script>
      <template><div>FROM_SFC</div></template>
    `)

    await build()

    const html = readFileSync(join(tempDir, 'dist/test.html'), 'utf-8')
    expect(html).toContain('AFTER_TRANSFORM_RAN')
    expect(html).not.toContain('FROM_SFC')
  })

  it('SFC useEvent(afterBuild) handlers from multiple templates all fire', async () => {
    const markerA = join(tempDir, 'a.marker')
    const markerB = join(tempDir, 'b.marker')

    writeSfc(tempDir, 'emails/a.vue', `
      <script setup>
      import { writeFileSync } from 'node:fs'
      useEvent('afterBuild', ({ files }) => {
        writeFileSync('${markerA.replace(/\\/g, '\\\\')}', String(files.length))
      })
      </script>
      <template><div>A</div></template>
    `)
    writeSfc(tempDir, 'emails/b.vue', `
      <script setup>
      import { writeFileSync } from 'node:fs'
      useEvent('afterBuild', ({ files }) => {
        writeFileSync('${markerB.replace(/\\/g, '\\\\')}', String(files.length))
      })
      </script>
      <template><div>B</div></template>
    `)

    await build()

    expect(existsSync(markerA)).toBe(true)
    expect(existsSync(markerB)).toBe(true)
  })

  it('SFC useEvent handlers do not leak across templates', async () => {
    // Template A registers an afterTransform handler that would mutate ANY html.
    writeSfc(tempDir, 'emails/a.vue', `
      <script setup>
      useEvent('afterTransform', ({ html }) => html.replace('LEAK_TARGET', 'A_LEAKED'))
      </script>
      <template><div>marker-a</div></template>
    `)
    /**
     * Template B contains the LEAK_TARGET token. If A's handler
     * leaks, B's output would contain 'A_LEAKED'.
     */
    writeSfc(tempDir, 'emails/b.vue', `
      <template><div>LEAK_TARGET</div></template>
    `)

    await build()

    const bHtml = readFileSync(join(tempDir, 'dist/b.html'), 'utf-8')
    expect(bHtml).toContain('LEAK_TARGET')
    expect(bHtml).not.toContain('A_LEAKED')
  })

  it('skips transformers when useTransformers is false', async () => {
    writeSfc(tempDir, 'emails/test.vue', `
      <template>
        <html><head><style>.a { color: red }</style></head><body><div class="a">Hi</div></body></html>
      </template>
    `)

    const result = await build({ useTransformers: false })

    const html = readFileSync(result.files[0], 'utf-8')
    // No inlining/purging ran, so the <style> block stays as-authored.
    expect(html).toContain('<style>.a { color: red }</style>')
  })

  it('derives the output path from a content pattern with no trailing-slash base', async () => {
    writeSfc(tempDir, 'emails/mail.vue', `<template><div>x</div></template>`)

    const result = await build({ content: ['emails/mail*.vue'] })

    expect(result.files).toHaveLength(1)
    expect(result.files[0]).toContain('mail.html')
  })

  it('builds nothing when every content pattern is negated', async () => {
    writeSfc(tempDir, 'emails/skip.vue', `<template><div>x</div></template>`)

    const result = await build({ content: ['!emails/skip.vue'] })

    expect(result.files).toHaveLength(0)
  })
})

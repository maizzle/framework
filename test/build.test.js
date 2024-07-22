import path from 'pathe'
import build from '../src/commands/build.js'
import { rm, readFile } from 'node:fs/promises'
import { describe, expect, test, beforeEach, afterEach, afterAll, vi } from 'vitest'

describe.concurrent('Build', () => {
  beforeEach(async context => {
    context.folder = '_temp_' + Math.random().toString(36).slice(2, 9)
  })

  afterEach(async context => {
    if (context.folder) {
      await rm(context.folder, { recursive: true }).catch(() => {})
      context.folder = undefined
    }
  })

  test('Throws if no config found', async () => {
    await expect(() => build({})).rejects.toThrow()
  })

  test('Throws if no templates found', async () => {
    await expect(() => build({ build: { content: ['test/fixtures/**/*.php'] } })).rejects.toThrow('No templates found in')
  })

  test('Throws if build.files is invalid', async () => {
    await expect(() => build({
      build: {
        content: true
      }
    })).rejects.toThrow()
  })

  test('Runs `beforeCreate` event', async ctx => {
    const { config } = await build(
      {
        build: {
          content: ['test/fixtures/build/**/*.html'],
          output: {
            path: ctx.folder
          }
        },
        async beforeCreate({ config }) {
          config.foo = '`beforeCreate` with build()'
          expect(config).toBeInstanceOf(Object)
        }
      }
    )

    expect(config.foo).toBe('`beforeCreate` with build()')
  })

  test('Runs `afterBuild` event', async ctx => {
    await build(
      {
        build: {
          content: ['test/fixtures/**/beforeCreate.html'],
          output: {
            path: ctx.folder
          }
        },
        css: {
          tailwind: {
            content: ['test/fixtures/build/**/*.html']
          }
        },
        async afterBuild({ files, config, transform }) {
          ctx.afterBuild = files
          expect(config).toBeInstanceOf(Object)
          expect(files).toBeInstanceOf(Array)
          expect(transform.inlineCSS).toBeInstanceOf(Function)
        }
      }
    )

    expect(ctx.afterBuild).toContain(`${ctx.folder}/build/beforeCreate.html`)
  })

  test('Outputs files', async ctx => {
    ctx.arrayGlobFiles = await build(
      {
        build: {
          content: ['test/fixtures/**/*.html', '!test/fixtures/filters.html', '!test/fixtures/build/expandLinkTag.html'],
          output: {
            path: ctx.folder,
            extension: 'php'
          }
        },
        css: {
          tailwind: {
            content: ['test/fixtures/build/**/*.html']
          }
        }
      }
    ).then(({ files }) => files)

    ctx.stringGlobFiles = await build(
      {
        build: {
          content: ['test/fixtures/**/*.html'],
          output: {
            path: path.join(ctx.folder, 'str'),
          }
        },
        css: {
          tailwind: {
            content: ['test/fixtures/build/**/*.html']
          }
        }
      }
    ).then(({ files }) => files)

    expect(ctx.arrayGlobFiles.length).toBe(5)
    expect(ctx.arrayGlobFiles).toContain(`${ctx.folder}/build/beforeCreate.php`)

    expect(ctx.stringGlobFiles.length).toBe(5)
    expect(ctx.stringGlobFiles).toContain(`${ctx.folder}/str/filters.html`)
  })

  test('Logs build report', async ctx => {
    const consoleMock = vi.spyOn(console, 'log').mockImplementation(() => undefined)

    afterAll(() => {
      consoleMock.mockReset()
    })

    await build(
      {
        build: {
          content: 'test/fixtures/build/**/*.html',
          output: {
            path: ctx.folder
          },
          summary: true
        },
        css: {
          tailwind: {
            content: ['test/fixtures/build/**/*.html']
          }
        }
      }
    )

    expect(consoleMock).toHaveBeenCalled()
    expect(consoleMock).toHaveBeenCalledWith(expect.stringContaining('Build time'))
  })

  test('Copies static files to output directory', async ctx => {
    ctx.files = await build(
      {
        build: {
          content: ['test/fixtures/build/*.html'],
          output: {
            path: ctx.folder
          },
          static: {
            source: ['test/stubs/static/**/*'],
          }
        },
        css: {
          tailwind: {
            content: ['test/fixtures/build/**/*.html']
          }
        },
      }
    ).then(({ files }) => files)

    expect(ctx.files.length).toBe(4)
    expect(ctx.files).toContain(`${ctx.folder}/image.png`)
  })

  test('Generates plaintext file', async ctx => {
    ctx.files = await build(
      {
        build: {
          content: ['test/fixtures/**/beforeCreate.html'],
          output: {
            path: ctx.folder
          },
        },
        plaintext: true,
        css: {
          tailwind: {
            content: ['test/fixtures/build/**/*.html']
          }
        },
      }
    ).then(({ files }) => files)

    expect(ctx.files).toContain(`${ctx.folder}/build/beforeCreate.txt`)
  })

  test('Expands <link> tags', async ctx => {
    const { files } = await build(
      {
        build: {
          content: ['test/fixtures/build/**/*.html'],
          output: {
            path: ctx.folder
          },
        },
        css: {
          tailwind: {
            content: ['test/fixtures/build/**/*.html']
          }
        },
      }
    )

    const fileContents = await readFile(files.filter(f => f.includes('expandLinkTag'))[0], 'utf8')

    expect(fileContents).toContain('display: none')
    expect(fileContents).not.toContain('expand')
    expect(fileContents).toContain('link')
  })
})

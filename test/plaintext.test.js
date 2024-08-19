import {
  beforeEach,
  afterEach,
  describe,
  expect,
  test } from 'vitest'
import {
  generatePlaintext,
  handlePlaintextTags,
  writePlaintextFile
} from '../src/generators/plaintext.js'
import { rm, readdir, readFile } from 'node:fs/promises'

const minify = html => html.replaceAll(/[\s\n]+/g, '')

describe.concurrent('Plaintext', () => {
  beforeEach(async context => {
    context.folder = '_temp_' + Math.random().toString(36).slice(2, 9)
  })

  afterEach(async context => {
    if (context.folder) {
      await rm(context.folder, { recursive: true }).catch(() => {})
      context.folder = undefined
    }
  })

  test('Throws is plaintext content is not provided', async () => {
    await expect(writePlaintextFile(undefined)).rejects.toThrow('Missing plaintext content.')
  })

  test('Throws is plaintext content is not a string', async () => {
    await expect(writePlaintextFile(true)).rejects.toThrow('Plaintext content must be a string.')
  })

  test('Does not generate plaintext if no HTML is provided', async () => {
    expect(await generatePlaintext()).toBe('')
  })

  test('Generates plaintext', async () => {
    const html = `
      <div>Show in HTML</div>
      <plaintext>Show in plaintext</plaintext>
      <not-plaintext>
        <p>Do not show <a href="url">this</a> in plaintext.</p>
      </not-plaintext>
    `

    const expected = 'Show in HTML\nShow in plaintext'

    const result = await generatePlaintext(html)

    expect(result).toBe(expected)
  })

  test('Generates plaintext (with options)', async () => {
    const html = `
      <div>Show in HTML &amp; plaintext &check;</div>
      <plaintext>Show <a href="https://example.com">this</a> in plaintext</plaintext>
      <not-plaintext>
        <p>Do not show this in plaintext.</p>
      </not-plaintext>
    `

    const expected = 'Show in HTML & plaintext ✓\nShow this [https://example.com] in plaintext'

    const result = await generatePlaintext(
      html,
      {
        dumpLinkHrefsNearby: {
          wrapHeads: '[',
          wrapTails: ']'
        },
        posthtml: {
          decodeEntities: true
        }
      },
    )

    expect(result).toBe(expected)
  })

  test('Outputs plaintext files', async ctx => {
    /**
     * `plaintext` as a file path
     */
    const withOptions = await writePlaintextFile('test', {
      plaintext: `${ctx.folder}/plaintext.txt`
    })

    const withOptionsFiles = await readdir(ctx.folder)
    const withOptionsFileContents = await readFile(`${ctx.folder}/plaintext.txt`, 'utf8')

    // Successful file write fulfills the promise with `undefined`
    expect(withOptions).toBe(undefined)
    expect(withOptionsFiles).toContain('plaintext.txt')
    expect(withOptionsFileContents).toBe('test')

    /**
     * `plaintext` as a directory path
     */
    const withDirPath = await writePlaintextFile('test', {
      build: {
        current: {
          path: {
            name: 'plaintext'
          }
        }
      },
      plaintext: `${ctx.folder}/txt`
    })

    const withDirPathFiles = await readdir(`${ctx.folder}/txt`)
    const withDirPathFileContents = await readFile(`${ctx.folder}/txt/plaintext.txt`, 'utf8')

    // Successful file write fulfills the promise with `undefined`
    expect(withDirPath).toBe(undefined)
    expect(withDirPathFiles).toContain('plaintext.txt')
    expect(withDirPathFileContents).toBe('test')

    const withPermalink = await writePlaintextFile('with permalink', {
      plaintext: true ,
      permalink: `${ctx.folder}/plaintext2.html`
    })

    const withPermalinkFiles = await readdir(ctx.folder)
    const withPermalinkFileContents = await readFile(`${ctx.folder}/plaintext2.txt`, 'utf8')

    // Successful file write fulfills the promise with `undefined`
    expect(withPermalink).toBe(undefined)
    expect(withPermalinkFiles).toContain('plaintext2.txt')
    expect(withPermalinkFileContents).toBe('with permalink')
  })

  test('Handles custom <plaintext> tags', async () => {
    const html = `
      <p>This should exist in the returned HTML.</p>
      <plaintext>This should be removed from the returned HTML</plaintext>
      <not-plaintext>
        <p>This should also exist in the returned HTML.</p>
      </not-plaintext>
    `

    const expected = `
      <p>This should exist in the returned HTML.</p>
      <p>This should also exist in the returned HTML.</p>
    `

    const result = await handlePlaintextTags(html)

    expect(minify(result)).toBe(minify(expected))
  })

  test('Returns original input if it is empty', async () => {
    expect(await handlePlaintextTags('')).toBe('')
  })
})

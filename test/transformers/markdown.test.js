import { describe, expect, test } from 'vitest'
import { markdown } from '../../src/index.js'

describe.concurrent('Markdown', () => {
  test('Ignores empty strings', async () => {
    expect(await markdown('')).toBe('')
  })

  test('Works with options', async () => {
    expect(
      await markdown('maizzle.com', { markdownit: { linkify: true } })
    ).toBe('<p><a href="http://maizzle.com">maizzle.com</a></p>\n')
  })

  test('Works with markdown content', async () => {
    expect(await markdown('# Foo\n_foo_'))
      .toBe('<h1>Foo</h1>\n<p><em>foo</em></p>\n')
  })

  test('Works with <md> tag', async () => {
    expect(
      await markdown('<md tag="section"># Foo\n_foo_</md>', { manual: true })
    ).toBe('<section>\n<h1>Foo</h1>\n<p><em>foo</em></p>\n</section>')
  })
})

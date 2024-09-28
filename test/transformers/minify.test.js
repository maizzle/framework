import { describe, expect, test } from 'vitest'
import { minify } from '../../src/index.js'
import { run as useTransformers } from '../../src/transformers/index.js'

describe.concurrent('Minify', () => {
  const html = '<div>\n\n<p>\n\n  test</p></div>'

  test('Sanity test', async () => {
    expect(await minify(html)).toBe('<div><p> test</p></div>')
  })

  test('Works with options', async () => {
    expect(await minify(html, { lineLengthLimit: 4 })).toBe('<div>\n<p>\ntest\n</p>\n</div>')
  })

  test('useTransformers context', async () => {
    expect(
      await useTransformers(html, { minify: true }).then(({ html }) => html)
    ).toBe('<div><p> test</p></div>')
  })
})

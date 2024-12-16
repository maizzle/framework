import { describe, expect, test } from 'vitest'
import { prettify } from '../../src/index.js'
import { run as useTransformers } from '../../src/transformers/index.js'

describe.concurrent('Prettify', () => {
  const html = '<div><p>test</p></div>'

  test('Basic functionality', async () => {
    expect(await prettify(html)).toBe('<div>\n  <p>test</p>\n</div>')
  })

  test('Works with options', async () => {
    expect(await prettify(html, { indent_size: 4 })).toBe('<div>\n    <p>test</p>\n</div>')
  })

  test('useTransformers context', async () => {
    expect(
      await useTransformers(html, { prettify: true }).then(({ html }) => html)
    ).toBe('<div>\n  <p>test</p>\n</div>')
  })
})

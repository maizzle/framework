import { describe, expect, test } from 'vitest'
import { removeAttributes } from '../../src/index.js'
import { run as useTransformers } from '../../src/transformers/index.js'

describe.concurrent('Remove attributes', () => {
  const html = '<div style="" remove keep role="article" delete-me="with-regex">test</div>'

  const options = [
    { name: 'role', value: 'article' },
    'remove',
    { name: 'delete-me', value: /^with/ }
  ]

  test('Sanity test', async () => {
    expect(await removeAttributes(html, options)).toBe('<div keep>test</div>')
  })

  test('useTransformers context', async () => {
    expect(
      await useTransformers(html, { attributes: { remove: options } }).then(({ html }) => html)
    ).toBe('<div keep>test</div>')
  })
})

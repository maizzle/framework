import { describe, expect, test } from 'vitest'
import { run as useTransformers } from '../../src/transformers/index.js'

describe.concurrent('Core transformers', () => {
  test('Removes <plaintext> tag in local dev', async () => {
    const { html } = await useTransformers(
      'keep<plaintext>remove</plaintext>',
      { _dev: true }
    )

    expect(html).toBe('keep')
  })

  test('Uses `no-inline` attribute to prevent inlining CSS from <style> tags', async () => {
    const { html } = await useTransformers(
      '<style no-inline>keep</style>',
      { _dev: true }
    )

    expect(html).toBe('<style data-embed>keep</style>')

    const withNoInlineAndDataEmbedAttr = await useTransformers(
      '<style no-inline data-embed>keep</style>',
      { _dev: true }
    )

    expect(withNoInlineAndDataEmbedAttr.html).toBe('<style data-embed>keep</style>')
  })
})

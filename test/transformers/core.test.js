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

  test('Uses custom attributes to prevent inlining CSS from <style> tags', async () => {
    const { html } = await useTransformers(
      `
        <style no-inline>keep</style>
        <style embed>this too</style>
        <style no-inline data-embed>also this</style>
      `,
      { _dev: true }
    )

    expect(html).toContain('<style data-embed>keep</style>')
    expect(html).toContain('<style data-embed>this too</style>')
    expect(html).toContain('<style data-embed>also this</style>')
  })
})

import { describe, expect, test } from 'vitest'
import { preventWidows } from '../../src/index.js'

describe.concurrent('Widow words', () => {
  test('Prevents widow words', async () => {
    const result = await preventWidows('one two', { minWordCount: 2 })

    expect(result).toBe('one&nbsp;two')
  })

  test('Ignores strings inside expressions', async () => {
    const result = await preventWidows('<div no-widows>{{{ one two three }}}</div>', {
      ignore: [
        { heads: '{{{', tails: '}}}' }
      ],
      withAttributes: true
    })

    expect(result).toBe('<div>{{{ one two three }}}</div>')
  })

  test('Applies only to tags with the `no-widows` attribute', async () => {
    const result = await preventWidows('<p no-widows>one two three</p><p>4 5 6</p>', { withAttributes: true })

    expect(result).toBe('<p>one two&nbsp;three</p><p>4 5 6</p>')
  })
})

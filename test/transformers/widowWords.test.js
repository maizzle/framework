import { describe, expect, test } from 'vitest'
import { preventWidows } from '../../src/index.js'

describe.concurrent('Widow words', () => {
  test('Prevents widow words', async () => {
    const result = await preventWidows('one two', { minWordCount: 2 })

    expect(result).toBe('one&nbsp;two')
  })

  test('Ignores strings inside expressions', async () => {
    const result = await preventWidows('<div prevent-widows>{{{ one two three }}}</div>', {
      ignore: [
        { heads: '{{{', tails: '}}}' }
      ],
      withAttributes: true
    })

    expect(result).toBe('<div>{{{ one two three }}}</div>')
  })

  test('Applies only to tags with the `prevent-widows` attribute', async () => {
    const result = await preventWidows('<div prevent-widows>one two three</div>', { withAttributes: true })

    expect(result).toBe('<div>one two&nbsp;three</div>')
  })
})

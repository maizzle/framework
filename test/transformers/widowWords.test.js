import { describe, expect, test } from 'vitest'
import { preventWidows } from '../../src/index.js'

describe.concurrent('Widow words', () => {
  test('Prevents widow words', async () => {
    const result = await preventWidows('<p no-widows>one two</p>', { minWords: 2 })

    expect(result).toBe('<p>one&nbsp;two</p>')
  })

  test('Ignores strings inside expressions', async () => {
    const result = await preventWidows('<div no-widows>{{{ one two three }}}</div>', {
      ignore: [
        { start: '{{{', end: '}}}' }
      ]
    })

    expect(result).toBe('<div>{{{ one two three }}}</div>')
  })

  test('Applies only to tags with the `no-widows` attribute', async () => {
    const result = await preventWidows('<p no-widows>one two three</p><p>4 5 6</p>', { withAttributes: true })

    expect(result).toBe('<p>one two&nbsp;three</p><p>4 5 6</p>')
  })

  test('Ignores MSO comments', async () => {
    expect(await preventWidows('<!--[if mso]>one two three<![endif]-->')).toBe('<!--[if mso]>one two three<![endif]-->')
  })
})

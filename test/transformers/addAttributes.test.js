import { expect, test } from 'vitest'
import { addAttributes } from '../../src/index.js'

test('Add attributes', async () => {
  const result = await addAttributes('<div></div>', {
    div: {
      role: 'article'
    }
  })

  expect(result).toBe('<div role="article"></div>')
})

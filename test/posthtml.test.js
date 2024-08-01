import { describe, expect, test } from 'vitest'
import { process as posthtml } from '../src/posthtml/index.js'

describe.concurrent('PostHTML', () => {
  test('Throws on PostHTML processing error', async () => {
    await expect(posthtml('test', {
      posthtml: {
        plugins: [
          () => { throw new Error('TestError') }
        ]
      }
    })).rejects.toThrow('TestError')
  })
})

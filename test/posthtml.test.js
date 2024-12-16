import { describe, expect, test } from 'vitest'
import { process as posthtml } from '../src/posthtml/index.js'

const cleanString = (str) => str.replace(/\s+/g, ' ').trim()

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

  test('Works with default PostHTML options', async () => {
    const html = `
      <p>
        <?php echo $foo; ?>
      </p>
    `

    const { html: result } = await posthtml(html)

    expect(cleanString(result)).toBe('<p> <?php echo $foo; ?> </p>')
  })
})

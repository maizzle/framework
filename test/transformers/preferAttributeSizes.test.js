import { describe, expect, test } from 'vitest'
import { useAttributeSizes } from '../../src/index.js'
import { run as useTransformers } from '../../src/transformers/index.js'

describe.concurrent('Prefer attribute sizes', () => {
  const html = '<img src="image.jpg" style="width: 100px; height: auto">'

  test('Is disabled by default', async () => {
    expect(await useAttributeSizes(html)).toBe(html)
  })

  test('Basic functionality', async () => {
    expect(await useAttributeSizes(html, {
      width: ['table'],
      height: ['table']
    })).toBe(html)
  })

  test('Handles `img` attribute values correctly', async () => {
    expect(await useAttributeSizes(html, {
      width: ['img'],
      height: ['img']
    })).toBe('<img src="image.jpg" width="100" height="auto">')
  })

  test('useTransformers context', async () => {
    expect(
      await useTransformers(
        html,
        {
          css: {
            inline: {
              useAttributeSizes: true,
            }
          }
        })
        .then(({ html }) => html)
    ).toBe('<img src="image.jpg" width="100" height="auto">')
  })
})

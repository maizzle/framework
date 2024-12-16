import { describe, expect, test } from 'vitest'
import { readFile } from 'node:fs/promises'
import { addBaseUrl } from '../../src/index.js'
import { run as useTransformers } from '../../src/transformers/index.js'

const fixture = await readFile(new URL('../fixtures/base-url.html', import.meta.url), 'utf8')
const expected = await readFile(new URL('../expected/base-url.html', import.meta.url), 'utf8')

describe.concurrent('Base URL', () => {
  test('Ignores invalid option', async () => {
    expect(
      await addBaseUrl(fixture, true)
    ).toBe(fixture)
  })

  test('Works with other transformers', async () => {
    expect(
      await useTransformers(fixture, {
        baseURL: 'https://example.com/',
        // Expected string would be too long, so we disable auto-adding of attributes
        attributes: {
          add: {
            table: false,
            img: false
          }
        }
      }).then(({ html }) => html)
    ).toBe(expected)
  })

  test('Applies base URL (string option)', async () => {
    expect(
      await addBaseUrl(fixture, 'https://example.com/')
    ).toBe(expected)
  })

  test('Applies base URL (object option)', async () => {
    expect(
      await addBaseUrl(fixture, {
        url: 'https://example.com/',
        allTags: true,
      })
    ).toBe(expected)
  })
})

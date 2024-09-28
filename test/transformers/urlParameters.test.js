import { describe, expect, test } from 'vitest'
import { addURLParams } from '../../src/index.js'
import { cleanString } from '../../src/utils/string.js'
import { run as useTransformers } from '../../src/transformers/index.js'

describe.concurrent('URL parameters', () => {
  test('Sanity test', async () => {
    expect(
      cleanString(
        await addURLParams(`
            <a href="https://example.com">test</a>
            <link href="https://foo.bar">
          `,
          {
            bar: 'baz',
            qix: 'qux'
          }
        )
      )
    ).toBe(cleanString(`
      <a href="https://example.com?bar=baz&qix=qux">test</a>
      <link href="https://foo.bar">
    `))
  })

  test('With options', async () => {
    expect(
      cleanString(
        await addURLParams(
          `<a href="example.com">test</a>
            <link href="https://foo.bar">`,
          {
            _options: {
              tags: ['a[href*="example"]', 'link'],
              strict: false,
              qs: {
                encode: true
              }
            },
            foo: '@Bar@',
            bar: 'baz'
          }
        )
      )
    ).toBe(cleanString(`
        <a href="example.com?bar=baz&foo=%40Bar%40">test</a>
        <link href="https://foo.bar?bar=baz&foo=%40Bar%40">
      `))
    })

    test('useTransformers context', async () => {
      const { html: result } = await useTransformers(`
        <a href="https://example.com">test</a>
        <link href="https://foo.bar">
        `,
        {
          urlParameters: {
            bar: 'baz',
            qix: 'qux'
          }
        }
      )

      expect(
        cleanString(result)
      ).toBe(cleanString(`
        <a href="https://example.com?bar=baz&qix=qux">test</a>
        <link href="https://foo.bar">
      `))
  })
})

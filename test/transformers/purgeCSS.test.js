import { describe, expect, test } from 'vitest'
import { purgeCSS } from '../../src/index.js'
import { cleanString } from '../../src/utils/string.js'
import { run as useTransformers } from '../../src/transformers/index.js'

describe.concurrent('Purge CSS', () => {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          @media (screen) {
            .should-remove {color: yellow}
          }
          .foo {color: red}
          .foo:hover {color: blue}
          .should-keep {color: blue}
          .should-remove {color: white}
        </style>
      </head>
      <body>
        <div class="foo {{ test }}">test div with some text</div>
      </body>
    </html>`

  const options = {
    backend: [
      { heads: '{{', tails: '}}' }
    ],
    safelist: ['*keep*']
  }

  const expected = `<!DOCTYPE html>
    <html>
      <head>
        <style>
          .foo {color: red}
          .foo:hover {color: blue}
          .should-keep {color: blue}
        </style>
      </head>
      <body>
        <div class="foo {{ test }}">test div with some text</div>
      </body>
    </html>`

  test('Sanity test', async () => {
    expect(
      cleanString(
        await purgeCSS(html, options)
      )
    ).toBe(cleanString(expected))
  })

  test('useTransformers context', async () => {
    expect(
      await useTransformers(html, { css: { purge: options } }).then(({ html }) => html)
    ).toBe(expected)
  })
})

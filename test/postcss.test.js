import { describe, expect, test } from 'vitest'
import { process as posthtml } from '../src/posthtml/index.js'

const cleanString = (str) => str.replace(/\s+/g, ' ').trim()

describe.concurrent('PostCSS', () => {
  test('resolveProps', async () => {
    const input = `
      <style>
        :root {
          --color: red;
        }

        .foo {
          color: var(--color);
        }
      </style>
    `

    // Default: resolves CSS variables
    posthtml(input, {
      css: {
        lightning: false,
      }
    }).then(({ html }) => {
      expect(cleanString(html)).toBe(`<style> :root { --color: red; } .foo { color: red; color: var(--color); } </style>`)
    })

    // Disabling `resolveProps`
    posthtml(input, {
      css: {
        resolveProps: false,
      }
    }).then(({ html }) => {
      expect(cleanString(html)).toBe(`<style>:root { --color: red; } .foo { color: var(--color); } </style>`)
    })
  })

  test('resolveCalc', async () => {
    const html = `
      <style>
        .foo {
          width: calc(16px * 1.5569);
        }
      </style>
    `

    posthtml(html)
      .then(({ html }) => {
        expect(cleanString(html)).toBe('<style>.foo { width: 24.9104px; } </style>')
      })
  })

  test('functional color notation', async () => {
    const html = `
      <style>
        .bg-black\\/80 {
          background-color: rgb(0 0 1 / 0.8);
        }
        .text-white\\/20 {
          color: rgb(255 255 254 / 0.2);
        }
      </style>
    `

    posthtml(html)
      .then(({ html }) => {
        expect(cleanString(html))
          .toBe(
            cleanString(`
              <style>.bg-black\\/80 { background-color: rgba(0, 0, 1, .8); }
                .text-white\\/20 { color: rgba(255, 255, 254, .2); }
              </style>`
            )
          )
      })
  })

  test('removes duplicate selectors', async () => {
    const html = `
      <style>
        .foo { color: red; }
        .bar { color: #ff0; }
        .foo { color: #0f0; }
        .bar2 { color: #ff1; }
        </style>
    `

    posthtml(html)
      .then(({ html }) => {
        expect(cleanString(html)).toBe('<style>.bar { color: #ff0; } .foo { color: #0f0; } .bar2 { color: #ff1; } </style>')
      })
  })

  test('skips processing marked style tags', async () => {
    const html = `
      <style raw>
        .foo {
          @apply block;
        }
      </style>
    `

    posthtml(html)
      .then(({ html }) => {
        expect(cleanString(html)).toBe('<style> .foo { @apply block; } </style>')
      })
  })
})

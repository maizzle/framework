import { describe, expect, test } from 'vitest'
import { process as posthtml } from '../src/posthtml/index.js'

const cleanString = (str) => str.replace(/\s+/g, ' ').trim()

describe.concurrent('PostCSS', () => {
  test('Resolves CSS variables by default', async () => {
    const html = `
      <style>
        :root {
          --color: red;
        }
        .foo {
          color: var(--color);
        }
      </style>
      <p class="foo">test</p>
    `

    const { html: result } = await posthtml(html)

    expect(cleanString(result)).toBe(`<style> .foo { color: red; } </style> <p class="foo">test</p>`)
  })

  test('Does not resolve CSS variables', async () => {
    const html = `
      <style>
        :root {
          --color: red;
        }
        .foo {
          color: var(--color);
        }
      </style>
      <p class="foo">test</p>
    `

    const { html: result } = await posthtml(html, {
      css: {
        resolveProps: false,
      }
    })

    expect(cleanString(result)).toBe(`<style> :root { --color: red; } .foo { color: var(--color); } </style> <p class="foo">test</p>`)
  })

  test('Resolves CSS variables (with options)', async () => {
    const html = `
      <style>
        :root {
          --color: red;
        }
        .foo {
          color: var(--color);
          font-weight: var(--font-weight);
        }
      </style>
      <p class="foo">test</p>
    `

    const { html: result } = await posthtml(html, {
      css: {
        resolveProps: {
          variables: {
            '--font-weight': 'bold',
          }
        },
      }
    })

    expect(cleanString(result)).toBe(`<style>.foo { color: red; font-weight: bold; } </style> <p class="foo">test</p>`)
  })
})

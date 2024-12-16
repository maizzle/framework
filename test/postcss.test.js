import { describe, expect, test } from 'vitest'
import { process as posthtml } from '../src/posthtml/index.js'

const cleanString = (str) => str.replace(/\s+/g, ' ').trim()

describe.concurrent('PostCSS', () => {
  test('resolveProps', async () => {
    // Default: resolves CSS variables
    posthtml(`
      <style>
        :root {
          --color: red;
        }
        .foo {
          color: var(--color);
        }
      </style>
      <p class="foo">test</p>
    `).then(({ html }) => {
      expect(cleanString(html)).toBe(`<style> .foo { color: red; } </style> <p class="foo">test</p>`)
    })

    // Passing options
    posthtml(`
      <style>
        .foo {
          font-weight: var(--font-weight);
        }
      </style>
      <p class="foo">test</p>
    `, {
      css: {
        resolveProps: {
          variables: {
            '--font-weight': 'bold',
          }
        },
      }
    }).then(({ html }) => {
      expect(cleanString(html)).toBe(`<style>.foo { font-weight: bold; } </style> <p class="foo">test</p>`)
    })

    // Disabling `resolveProps`
    posthtml(`
      <style>
        :root {
          --color: red;
        }
        .foo {
          color: var(--color);
        }
      </style>
      <p class="foo">test</p>
    `, {
      css: {
        resolveProps: false,
      }
    }).then(({ html }) => {
      expect(cleanString(html)).toBe(`<style> :root { --color: red; } .foo { color: var(--color); } </style> <p class="foo">test</p>`)
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
        expect(cleanString(html)).toBe('<style> .foo { width: 24.91px; } </style>')
      })

    posthtml(html, {
      css: {
        resolveCalc: {
          precision: 1,
        },
      }
    }).then(({ html }) => {
      expect(cleanString(html)).toBe('<style> .foo { width: 24.9px; } </style>')
    })
  })
})

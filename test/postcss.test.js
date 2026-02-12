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

  test('functional color notation', async () => {
    const html = `
      <style>
        .bg-black/80 {
          background-color: rgb(0 0 1 / 0.8);
        }
        .text-white/20 {
          color: rgb(255 255 254 / 0.2);
        }
      </style>
    `

    posthtml(html)
      .then(({ html }) => {
        expect(cleanString(html))
          .toBe(
            cleanString(`
              <style>
                .bg-black/80 { background-color: rgba(0, 0, 1, 0.8); }
                .text-white/20 { color: rgba(255, 255, 254, 0.2); }
              </style>`
            )
          )
      })
  })

  test('css.media', async () => {
    const html = `
      <style>
        @tailwind components;
        @tailwind utilities;

        .custom {
          @apply sm:w-[100px];
        }
      </style>
    <div class="custom sm:flex hover:invisible"></div>
    `

    /**
     * When using `@apply` and the source content has pseudos like `hover:`,
     * the utilities generated with `@apply` will be separated in their own
     * media query blocks.
     *
     * This does not happen if the source content does not use things like `hover:` 🤷‍♂️
     */
    posthtml(html, {
      css: {
        tailwind: {
          content: [{ raw: html }],
          theme: {
            screens: {
              sm: { max: '600px' },
              xs: { max: '430px' },
            },
          },
        }
      }
    })
      .then(({ html }) => {
        expect(cleanString(html))
          .toBe(
            cleanString(`
            <style>
              @media (max-width: 600px) {
                .custom {
                  width: 100px
                }
              }
              .hover\\:invisible:hover {
                visibility: hidden
              }
              @media (max-width: 600px) {
                .sm\\:flex {
                  display: flex
                }
                .sm\\:w-\\[100px\\] {
                  width: 100px
                }
              }
            </style>
            <div class="custom sm:flex hover:invisible"></div>`
            )
          )
      })

    // plugin enabled
    posthtml(html, {
      css: {
        media: {
          merge: true,
        },
        tailwind: {
          content: [{ raw: html }],
          theme: {
            screens: {
              sm: { max: '600px' },
              xs: { max: '430px' },
            },
          },
        }
      }
    })
      .then(({ html }) => {
        expect(cleanString(html))
          .toBe(
            cleanString(`
            <style>
            .hover\\:invisible:hover {
              visibility: hidden
              }
              @media (max-width: 600px) {
                .custom {
                  width: 100px
                }
                .sm\\:flex {
                  display: flex
                }
                .sm\\:w-\\[100px\\] {
                  width: 100px
                }
              }
            </style>
            <div class="custom sm:flex hover:invisible"></div>`
            )
          )
      })
  })
})

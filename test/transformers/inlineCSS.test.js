import { describe, expect, test } from 'vitest'
import { inlineCSS } from '../../src/index.js'
import { cleanString } from '../../src/utils/string.js'
import { run as useTransformers } from '../../src/transformers/index.js'

const css = `
  .w-1 {width: 4px}
  .h-1 {height: 4px}
  .foo {color: red}
  .bar {cursor: pointer}
  .hover\\:foo:hover {color: blue}
  .bg-custom {background-image: url('https://picsum.photos/600/400') !important}
  @media (max-width: 600px) {
    .sm\\:text-center {text-align: center}
  }
  u + .body .gmail\\:hidden {
    display: none;
  }
`

const html = `
  <style>${css}</style>
  <p class="bar">test</p>
  <table class="w-1 h-1 sm:text-center bg-custom">
    <tr>
      <td class="foo bar h-1 gmail:hidden">test</td>
    </tr>
  </table>`

describe.concurrent('Inline CSS', () => {
  test('Invalid input', async () => {
    expect(await inlineCSS()).toBe('')
    expect(await inlineCSS('')).toBe('')
  })

  test('Sanity test', async () => {
    const result = await inlineCSS(html, {
      removeInlinedSelectors: true,
      codeBlocks: {
        RB: {
          start: '<%',
          end: '%>',
        },
      },
    })

    expect(cleanString(result)).toBe(cleanString(`
      <style>
        .hover\\:foo:hover {color: blue}
        @media (max-width: 600px) {
          .sm\\:text-center {text-align: center}
        }
        u + .body .gmail\\:hidden { display: none; }
      </style>
      <p style="cursor: pointer">test</p>
      <table class="sm:text-center" style="width: 4px; height: 4px; background-image: url('https://picsum.photos/600/400')">
        <tr>
          <td class="gmail:hidden" style="height: 4px; color: red; cursor: pointer">test</td>
        </tr>
      </table>`))
  })

  test('Preserves user-defined selectors', async () => {
    const result = await inlineCSS(`
      <style>
        .bar {margin: 0}
        .variant\\:foo {color: blue}
      </style>
      <p class="bar">test</p>
      <span class="variant:foo"></span>`,
      {
        removeInlinedSelectors: true,
        safelist: ['foo', '.bar'],
      })

    expect(cleanString(result)).toBe(cleanString(`
      <style>
        .bar {margin: 0}
        .variant\\:foo {color: blue}
        </style>
        <p class="bar" style="margin: 0">test</p>
        <span class="variant:foo" style="color: blue"></span>`
    ))
  })

  test('Preserves inlined selectors', async () => {
    const result = await inlineCSS(html, {
      removeInlinedSelectors: false,
    })

    expect(cleanString(result)).toBe(cleanString(`
      <style>
      .w-1 {width: 4px}
      .h-1 {height: 4px}
      .foo {color: red}
      .bar {cursor: pointer}
      .hover\\:foo:hover {color: blue}
      .bg-custom {background-image: url('https://picsum.photos/600/400') !important}
      @media (max-width: 600px) {
        .sm\\:text-center {text-align: center}
      }
      u + .body .gmail\\:hidden { display: none; }
    </style>
      <p class="bar" style="cursor: pointer">test</p>
      <table class="w-1 h-1 sm:text-center bg-custom" style="width: 4px; height: 4px; background-image: url('https://picsum.photos/600/400')">
        <tr>
          <td class="foo bar h-1 gmail:hidden" style="height: 4px; color: red; cursor: pointer">test</td>
        </tr>
      </table>`))
  })

  test('Works with `customCSS` option', async () => {
    expect(
      cleanString(
        await inlineCSS(
          '<p class="bar" style="color: red"></p>',
          {
            customCSS: '.bar {display: flex;}'
          }
        )
      )
    ).toBe('<p class="bar" style="display: flex; color: red;"></p>')
  })

  test('Works with `excludedProperties` option', async () => {
    expect(
      cleanString(
        await inlineCSS(`
          <style>.bar {cursor: pointer; margin: 0}</style>
          <p class="bar">test</p>`, {
          removeInlinedSelectors: true,
          excludedProperties: ['margin']
        })
      )
    ).toBe(cleanString(`
      <style></style>
      <p style="cursor: pointer">test</p>`))
  })

  test('Uses `applyWidthAttributes` and `applyHeightAttributes` by default', async () => {
    expect(
      await useTransformers('<style>.size-10px {width: 10px; height: 10px}</style><img class="size-10px">', {
        css: { inline: { removeInlinedSelectors: true } },
      }).then(({ html }) => html)
    ).toBe('<style></style><img style="width: 10px; height: 10px" width="10" height="10" alt>')
  })

  test('Does not inline <style> tags marked as "embedded"', async () => {
    expect(
      await inlineCSS(`
        <style embed>.foo {color: red}</style>
        <style data-embed>.foo {display: flex}</style>
        <p class="foo">test</p>`)
    ).toBe(`
        <style>.foo {color: red}</style>
        <style>.foo {display: flex}</style>
        <p class="foo">test</p>`
    )
  })

  test('useTransformers context', async () => {
    expect(
      cleanString(
        await useTransformers(html, {
          attributes: { add: false },
          css: { inline: { removeInlinedSelectors: true } },
        }).then(({ html }) => html)
      )
    ).toBe(cleanString(`
      <style>
        .hover-foo:hover {color: blue}
        @media (max-width: 600px) {
          .sm-text-center {text-align: center}
        }
        u + .body .gmail-hidden { display: none; }
      </style>
      <p style="cursor: pointer">test</p>
      <table class="sm-text-center" style="width: 4px; height: 4px; background-image: url('https://picsum.photos/600/400')">
        <tr>
          <td class="gmail-hidden" style="height: 4px; color: red; cursor: pointer">test</td>
        </tr>
      </table>`))
  })
})

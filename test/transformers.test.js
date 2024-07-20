import { describe, expect, test } from 'vitest'
import { readFile } from 'node:fs/promises'
import {
  addAttributes,
  attributeToStyle,
  addBaseUrl,
  purgeCSS,
  filters,
  inlineCSS ,
  markdown,
  minify,
  useMso,
  prettify,
  removeAttributes,
  replaceStrings,
  safeClassNames,
  shorthandCSS,
  sixHEX,
  addURLParams,
  useAttributeSizes,
  preventWidows
} from '../src/index.js'
import { run as useTransformers } from '../src/transformers/index.js'

const cleanString = (str) => str.replace(/\s+/g, ' ').trim()

describe.concurrent('Transformers', () => {
  test('Core', async () => {
    // Removes <plaintext> tag in local dev
    const removesPlaintextTag = await useTransformers(
      'keep<plaintext>remove</plaintext>',
      { _dev: true }
    )

    // Custom attributes to prevent inlining CSS from <style> tags
    const withNoInlineAttr = await useTransformers(
      '<style no-inline>keep</style>',
      { _dev: true }
    )
    const withNoInlineAndDataEmbedAttr = await useTransformers(
      '<style no-inline data-embed>keep</style>',
      { _dev: true }
    )

    expect(removesPlaintextTag.html).toBe('keep')
    expect(withNoInlineAttr.html).toBe('<style data-embed>keep</style>')
    expect(withNoInlineAndDataEmbedAttr.html).toBe('<style data-embed>keep</style>')
  })

  test('Safe class names', async () => {
    const html = `
      <style>
        .sm\\:text-left {
          text-align: left;
        }
        .w-1\\.5 {
          width: 1.5rem;
        }
      </style>
      <div class="sm:text-left w-1.5">foo</div>
    `

    const result = await safeClassNames(html, {
      replacements: {
        '.': '_dot_',
      }
    })

    const withBooleanOptions = await safeClassNames(html, true)

    const withPostHTML = await useTransformers(html, {
      css: {
        safe: {
          replacements: {
            '.': '_dot_',
          }
        }
      }
    }).then(({ html }) => html)

    const expected = `<style>
        .sm-text-left {
          text-align: left;
        }
        .w-1_dot_5 {
          width: 1.5rem;
        }
      </style>
      <div class="sm-text-left w-1_dot_5">foo</div>`

    expect(result.trim()).toBe(expected)
    expect(withPostHTML.trim()).toBe(expected)

    expect(withBooleanOptions).toBe(`
      <style>
        .sm-text-left {
          text-align: left;
        }
        .w-1_5 {
          width: 1.5rem;
        }
      </style>
      <div class="sm-text-left w-1_5">foo</div>
    `)
  })

  test('Filters', async () => {
    const fixture = await readFile(new URL('fixtures/filters.html', import.meta.url), 'utf8')
    const expected = await readFile(new URL('expected/filters.html', import.meta.url), 'utf8')
    const customFilters = {
      'underscore-case': string => string.split('').join('_'),
    }

    const result = await filters(fixture, customFilters)

    expect(result).toBe(expected)
    expect(
      await useTransformers(fixture, { filters: customFilters }).then(({ html }) => html)
    ).toBe(expected)
  })

  test('Markdown', async () => {
    const result = await markdown('# Foo\n_foo_')
    const result2 = await markdown('<md tag="section"># Foo\n_foo_</md>', { manual: true })

    expect(result).toBe('<h1>Foo</h1>\n<p><em>foo</em></p>\n')
    expect(result2).toBe('<section>\n<h1>Foo</h1>\n<p><em>foo</em></p>\n</section>')
    expect(
      await useTransformers('# Foo\n_foo_', { markdown: false }).then(({ html }) => html)
    ).toBe('# Foo\n_foo_')
  })

  test('Widow words', async () => {
    const result = await preventWidows('one two', { minWordCount: 2 })
    const result2 = await preventWidows('<div prevent-widows>one two three</div>', { withAttributes: true })
    const result3 = await preventWidows('<div prevent-widows>{{{ one two three }}</div>', {
      ignore: [
        { heads: '{{{', tails: '}}}' }
      ],
      withAttributes: true
    })

    expect(result).toBe('one&nbsp;two')
    expect(result2).toBe('<div>one two&nbsp;three</div>')
    expect(result3).toBe('<div>{{{ one two three }}</div>')
    expect(
      await useTransformers('<div prevent-widows>one two three</div>', { widowWords: { minWordCount: 3 } }).then(({ html }) => html)
    ).toBe('<div>one two&nbsp;three</div>')
  })

  test('Attribute to style', async () => {
    const html = `<table align="left" width="100%" height="600" bgcolor="#FFFFFF" background="https://example.com/image.jpg">
      <tr>
        <td align="center" valign="top"></td>
      </tr>
    </table>`

    const expected = `<table align="left" width="100%" height="600" bgcolor="#FFFFFF" background="https://example.com/image.jpg" style="float: left; width: 100%; height: 600px; background-color: #FFFFFF; background-image: url('https://example.com/image.jpg')">
      <tr>
        <td align="center" valign="top" style="text-align: center; vertical-align: top"></td>
      </tr>
    </table>`

    const html2 = `<table align="center">
      <tr>
        <td></td>
      </tr>
    </table>`

    const expected2 = `<table align="center" style="margin-left: auto; margin-right: auto">
      <tr>
        <td></td>
      </tr>
    </table>`

    // Expands attributes to inline CSS
    expect(
      await attributeToStyle(html, ['width', 'height', 'bgcolor', 'background', 'align', 'valign'])
    ).toBe(expected)
    // Expands align="center" to style="margin-left: auto; margin-right: auto"
    expect(await attributeToStyle(html2, ['align'])).toBe(expected2)
    // Does not expand anything if options are empty or false
    expect(await attributeToStyle(html2, [])).toBe(html2)
    expect(await attributeToStyle(html2, false)).toBe(html2)
    // Defaults to px for width values without units
    expect(await attributeToStyle('<td width="100" style="color: #000;"></td>', ['width'])).toBe('<td width="100" style="color: #000; width: 100px"></td>')

    expect(
      await useTransformers(html, {
        attributes: { add: false },
        css: { inline: { attributeToStyle: ['width', 'height'] } },
      }).then(({ html }) => html)
    ).toBe(`<table align="left" width="100%" height="600" bgcolor="#ffffff" background="https://example.com/image.jpg" style="width: 100%; height: 600px">
      <tr>
        <td align="center" valign="top"></td>
      </tr>
    </table>`)
  })

  test('Inline CSS', async () => {
    // Test for invalid input
    expect(await inlineCSS()).toBe('')
    expect(await inlineCSS('')).toBe('')

    const css = `
      .w-1 {width: 4px}
      .h-1 {height: 4px}
      .foo {color: red}
      .bar {cursor: pointer; margin: calc(4px * 0)}
      .hover\\:foo:hover {color: blue}
      .bg-custom {background-image: url('https://picsum.photos/600/400') !important}
      @media (max-width: 600px) {
        .sm\\:text-center {text-align: center}
      }
    `

    // Basic test
    const html = `
      <style>${css}</style>
      <p class="bar">test</p>
      <table class="w-1 h-1 sm:text-center bg-custom">
        <tr>
          <td class="foo bar h-1">test</td>
        </tr>
      </table>`

    const result = await inlineCSS(html, {
      removeInlinedSelectors: true,
      codeBlocks: {
        RB: {
          start: '<%',
          end: '%>',
        },
      },
    })

    expect(result).toBe(`
      <style>
      .hover\\:foo:hover {color: blue}
      @media (max-width: 600px) {
        .sm\\:text-center {text-align: center}
      }
    </style>
      <p style="cursor: pointer; margin: 0">test</p>
      <table class="sm:text-center" style="width: 4px; height: 4px; background-image: url('https://picsum.photos/600/400')">
        <tr>
          <td style="height: 4px; color: red; cursor: pointer; margin: 0">test</td>
        </tr>
      </table>`)

    // Test preserving selectors
    const withPreservedSelectors = await inlineCSS(html, {
      removeInlinedSelectors: false,
    })

    expect(withPreservedSelectors).toBe(`
      <style>
      .w-1 {width: 4px}
      .h-1 {height: 4px}
      .foo {color: red}
      .bar {cursor: pointer; margin: calc(4px * 0)}
      .hover\\:foo:hover {color: blue}
      .bg-custom {background-image: url('https://picsum.photos/600/400') !important}
      @media (max-width: 600px) {
        .sm\\:text-center {text-align: center}
      }
    </style>
      <p class="bar" style="cursor: pointer; margin: 0">test</p>
      <table class="w-1 h-1 sm:text-center bg-custom" style="width: 4px; height: 4px; background-image: url('https://picsum.photos/600/400')">
        <tr>
          <td class="foo bar h-1" style="height: 4px; color: red; cursor: pointer; margin: 0">test</td>
        </tr>
      </table>`)

    // Test using the transformer with options
    expect(
      await useTransformers(html, {
        attributes: { add: false },
        css: { inline: { removeInlinedSelectors: true } },
      }).then(({ html }) => html)
    ).toBe(`
      <style>
      .hover-foo:hover {color: blue}
      @media (max-width: 600px) {
        .sm-text-center {text-align: center}
      }
    </style>
      <p style="cursor: pointer; margin: 0">test</p>
      <table class="sm-text-center" style="width: 4px; height: 4px; background-image: url('https://picsum.photos/600/400')">
        <tr>
          <td style="height: 4px; color: red; cursor: pointer; margin: 0">test</td>
        </tr>
      </table>`)

    // Test using custom CSS
    const withCustomCSS = await inlineCSS(
      '<p class="bar" style="color: red"></p>',
      {
        customCSS: '.bar {display: flex;}'
      }
    )
    expect(withCustomCSS).toBe('<p class="bar" style="display: flex; color: red;"></p>')

    //  With excludedProperties
    const withExcludedProperties = await inlineCSS(`
      <style>.bar {cursor: pointer; margin: 0}</style>
      <p class="bar">test</p>`, {
      removeInlinedSelectors: true,
      excludedProperties: ['margin']
    })

    expect(withExcludedProperties).toBe(`
      <style></style>
      <p style="cursor: pointer">test</p>`)

    expect(
      await inlineCSS(`
        <style embed>.foo {color: red}</style>
        <p class="foo">test</p>`)
    ).toBe(`
        <style>.foo {color: red}</style>
        <p class="foo">test</p>`
    )

    // applyWidthAttributes and applyHeightAttributes
    expect(
      await useTransformers('<style>.size-10px {width: 10px; height: 10px}</style><img class="size-10px">', {
        css: { inline: { removeInlinedSelectors: true } },
      }).then(({ html }) => html)
    ).toBe('<style></style><img style="width: 10px; height: 10px" width="10" height="10" alt="">')
  })

  test('Purge CSS', async () => {
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
            .bar-baz {color: blue}
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
      whitelist: ['.bar*']
    }

    const result = await purgeCSS(html, options)

    const expected = `<!DOCTYPE html>
      <html>
        <head>
          <style>
            .foo {color: red}
            .foo:hover {color: blue}
            .bar-baz {color: blue}
          </style>
        </head>
        <body>
          <div class="foo {{ test }}">test div with some text</div>
        </body>
      </html>`

    expect(result).toBe(expected)

    expect(
      await useTransformers(html, { css: { purge: options } }).then(({ html }) => html)
    ).toBe(expected)
  })

  test('Remove attributes', async () => {
    const html = '<div style="" remove keep role="article" delete-me="with-regex">test</div>'

    const options = [
      { name: 'role', value: 'article' },
      'remove',
      { name: 'delete-me', value: /^with/ }
    ]

    expect(await removeAttributes(html, options)).toBe('<div keep>test</div>')

    expect(
      await useTransformers(html, { attributes: { remove: options } }).then(({ html }) => html)
    ).toBe('<div keep>test</div>')
  })

  test('Shorthand CSS', async () => {
    const html = '<div style="margin-top: 0px; margin-right: 4px; margin-bottom: 0; margin-left: 0; padding-top: 0; padding-right: 0; padding-bottom: 0; padding-left: 2px;"></div>'
    const expected = '<div style="margin: 0px 4px 0 0; padding: 0 0 0 2px;"></div>'

    expect(await shorthandCSS(html)).toBe(expected)
    expect(await shorthandCSS(html, {
      tags: ['div']
    })).toBe(expected)
    expect(
      await useTransformers(html, { css: { shorthand: true } }).then(({ html }) => html)
    ).toBe(expected)
  })

  test('Add attributes', async () => {
    const result = await addAttributes('<div></div>', {
      div: {
        role: 'article'
      }
    })

    expect(result).toBe('<div role="article"></div>')

    expect(
      await useTransformers('<div></div>', { attributes: { add: { div: { role: 'article' } } } }).then(({ html }) => html)
    ).toBe('<div role="article"></div>')
  })

  test('Prefer attribute sizes', async () => {
    const html = '<img src="image.jpg" style="width: 100px; height: auto">'

    expect(await useAttributeSizes(html)).toBe(html)
    expect(await useAttributeSizes(html, {
      width: ['table'],
      height: ['table']
    })).toBe(html)
    expect(await useAttributeSizes(html, {
      width: ['img'],
      height: ['img']
    })).toBe('<img src="image.jpg" width="100" height="auto">')

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
    ).toBe('<img src="image.jpg" width="100" height="auto" alt="">')
  })

  test('Base URL', async () => {
    const fixture = await readFile(new URL('fixtures/base-url.html', import.meta.url), 'utf8')
    const expected = await readFile(new URL('expected/base-url.html', import.meta.url), 'utf8')

    const withInvalid = await addBaseUrl(fixture, true)
    const withString = await addBaseUrl(fixture, 'https://example.com/')
    const withObject = await addBaseUrl(fixture, {
      url: 'https://example.com/',
      allTags: true,
    })

    expect(withInvalid).toBe(fixture)
    expect(withString).toBe(expected)
    expect(withObject).toBe(expected)

    expect(
      await useTransformers(fixture, {
        baseURL: 'https://example.com/',
        // Expected string too long, need to disable auto-adding of attributes
        attributes: {
          add: {
            table: false,
            img: false
          }
        }
      }).then(({ html }) => html)
    ).toBe(expected)
  })

  test('URL parameters', async () => {
    const simple = await addURLParams(
      `<a href="https://example.com">test</a>
        <link href="https://foo.bar">`,
      {
        bar: 'baz',
        qix: 'qux'
      }
    )

    const withOptions = await addURLParams(
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

    expect(simple).toBe(
      `<a href="https://example.com?bar=baz&qix=qux">test</a>
        <link href="https://foo.bar">`
    )

    expect(withOptions).toBe(
      `<a href="example.com?bar=baz&foo=%40Bar%40">test</a>
        <link href="https://foo.bar?bar=baz&foo=%40Bar%40">`
    )

    expect(
      await useTransformers(simple, {
        urlParameters: {
          bar: 'baz',
          qix: 'qux'
        }
      }).then(({ html }) => html)
    ).toBe(simple)
  })

  test('Six-digit HEX', async () => {
    const html = await sixHEX(`
      <div bgcolor="#000" style="color: #fff; background-color: #000">This should not change: #ffc</div>
      <font color="#fff">Text</font>`)

    expect(html).toBe(`
      <div bgcolor="#000000" style="color: #fff; background-color: #000">This should not change: #ffc</div>
      <font color="#ffffff">Text</font>`)

    expect(
      await useTransformers(html, { css: { sixHex: true } }).then(({ html }) => html)
    ).toBe(html)
  })

  test('MSO tags', async () => {
    const html = await useMso(`
      <outlook>show in outlook</outlook>
      <not-outlook>hide from outlook</not-outlook>
    `)

    expect(html).toBe(`
      <!--[if mso]>show in outlook<![endif]-->
      <!--[if !mso]><!-->hide from outlook<!--<![endif]-->
    `)

    expect(
      await useTransformers('<mso>show in outlook</mso>', { outlook: { tag: 'mso' } }).then(({ html }) => html)
    ).toBe('<!--[if mso]>show in outlook<![endif]-->')
  })

  test('Prettify', async () => {
    const html = '<div><p>test</p></div>'

    expect(await prettify(html)).toBe('<div>\n  <p>test</p>\n</div>')
    expect(await prettify(html, { indent_size: 4 })).toBe('<div>\n    <p>test</p>\n</div>')

    expect(
      await useTransformers(html, { prettify: true }).then(({ html }) => html)
    ).toBe('<div>\n  <p>test</p>\n</div>')
  })

  test('Minify', async () => {
    const html = '<div>\n\n<p>\n\n  test</p></div>'

    expect(await minify(html)).toBe('<div><p> test</p></div>')
    expect(await minify(html, { lineLengthLimit: 4 })).toBe('<div>\n<p>\ntest\n</p>\n</div>')
    expect(
      await useTransformers(html, { minify: true }).then(({ html }) => html)
    ).toBe('<div><p> test</p></div>')
  })

  test('Replace strings', async () => {
    expect(await replaceStrings('initial text')).toBe('initial text')
    expect(await replaceStrings('initial text', {})).toBe('initial text')
    expect(await replaceStrings('initial text', { '/not/': 'found' })).toBe('initial text')
    expect(await replaceStrings('initial text', { 'initial': 'updated' })).toBe('updated text')

    expect(
      await useTransformers('initial text', { replaceStrings: { 'initial': 'updated' } }).then(({ html }) => html)
    ).toBe('updated text')
  })

  test('<template> tags', async () => {
    const { html } = await useTransformers(`
      <template uppercase>test</template>
      <template preserve>test</template>
    `)

    expect(cleanString(html)).toBe('TEST <template>test</template>')
  })
})

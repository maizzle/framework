const test = require('ava')
const Maizzle = require('../src')

const path = require('path')
const fs = require('fs')

const readFile = (dir, filename) => fs.promises
  .readFile(path.join(__dirname, dir, `${filename}.html`), 'utf8')
  .then(html => html.trim())

const fixture = file => readFile('fixtures/transformers', file)
const expected = file => readFile('expected/transformers', file)

test('remove inline sizes', async t => {
  const options = {
    width: ['table'],
    height: ['td']
  }

  const html = await Maizzle.removeInlineSizes(`
    <table style="width: 10px; height: auto;">
      <tr>
        <td style="width: 100%; height: 10px;">test</td>
      </tr>
    </table>`,
  options)

  t.is(html, `
    <table style="height: auto">
      <tr>
        <td style="width: 100%">test</td>
      </tr>
    </table>`)
})

test('remove inline background-color', async t => {
  const html = await Maizzle.removeInlineBgColor(`<td style="background-color: red" bgcolor="red">test</td>`)
  const html2 = await Maizzle.removeInlineBgColor(
    `<td style="background-color: red" bgcolor="red">test</td>`,
    {
      inlineCSS: {
        preferBgColorAttribute: true
      }
    }
  )

  t.is(html, '<td style="" bgcolor="red">test</td>')
  t.is(html2, '<td style="" bgcolor="red">test</td>')
})

test('remove inline background-color (with tags)', async t => {
  const html = await Maizzle.removeInlineBgColor(
    `<table style="background-color: red"><tr><td style="background-color: red">test</td></tr></table>`,
    ['table']
  )

  t.is(html, '<table style="" bgcolor="red"><tr><td style="background-color: red">test</td></tr></table>')
})

test('inline CSS', async t => {
  const html = `
    <table class="w-1 h-1 text-center">
      <tr>
        <td class="foo bar h-1">test</td>
      </tr>
    </table>`
  const css = `
    .w-1 {width: 4px}
    .h-1 {height: 4px}
    .foo {color: red}
    .bar {cursor: pointer}
    .text-center {text-align: center}
  `

  const html2 = `
  <html>
    <head>
      <style>${css}</style>
    </head>
    <body>
      <table class="w-1 h-1 text-center">
        <tr>
          <td class="foo bar h-1">test</td>
        </tr>
      </table>
    </body>
  </html>`

  const result1 = await Maizzle.inlineCSS(html, {
    customCSS: css,
    removeStyleTags: false,
    styleToAttribute: {
      'text-align': 'align'
    },
    applyWidthAttributes: ['table'],
    applyHeightAttributes: ['td'],
    mergeLonghand: ['div'],
    excludedProperties: ['cursor'],
    codeBlocks: {
      RB: {
        start: '<%',
        end: '%>'
      }
    }
  })
  const result2 = await Maizzle.inlineCSS(html2, {
    removeStyleTags: false,
    styleToAttribute: {
      'text-align': 'align'
    },
    applyWidthAttributes: ['table'],
    applyHeightAttributes: ['td'],
    mergeLonghand: ['div'],
    excludedProperties: ['cursor'],
    codeBlocks: {
      RB: {
        start: '<%',
        end: '%>'
      }
    }
  })

  t.is(result1, `
    <table class="w-1 h-1 text-center" style="width: 4px; height: 4px; text-align: center;" width="4" align="center">
      <tr>
        <td class="foo bar h-1" style="height: 4px; color: red;" height="4">test</td>
      </tr>
    </table>`)

  t.is(result2, `
  <html>
    <head>
      <style>
    .w-1 {width: 4px}
    .h-1 {height: 4px}
    .foo {color: red}
    .bar {cursor: pointer}
    .text-center {text-align: center}
  </style>
    </head>
    <body>
      <table class="w-1 h-1 text-center" style="width: 4px; height: 4px; text-align: center;" width="4" align="center">
        <tr>
          <td class="foo bar h-1" style="height: 4px; color: red;" height="4">test</td>
        </tr>
      </table>
    </body>
  </html>`)
})

test('inline CSS (disabled)', async t => {
  const html = `<div class="foo">test</div>`
  const css = `.foo {color: red}`

  const result = await Maizzle.inlineCSS(html, {inlineCSS: false, customCSS: css})

  t.is(result, '<div class="foo">test</div>')
})

test('remove unused CSS', async t => {
  const html = `<!DOCTYPE html>
  <html>
    <head>
      <style>
        .foo {color: red}
        .bar-baz {color: blue}
        .baz {color: white}
      </style>
    </head>
    <body>
      <div class="foo {{ test }}">test div with some text</div>
    </body>
  </html>`

  const enabledResult = `<!DOCTYPE html>
  <html>
    <head>
      <style>
        .foo {color: red}
      </style>
    </head>
    <body>
      <div class="foo {{ test }}">test div with some text</div>
    </body>
  </html>`

  const withOptionsResult = `<!DOCTYPE html>
  <html>
    <head>
      <style>
        .foo {color: red}
        .bar-baz {color: blue}
      </style>
    </head>
    <body>
      <div class="foo {{ test }}">test div with some text</div>
    </body>
  </html>`

  const enabled = await Maizzle.removeUnusedCSS(html)
  const disabled = await Maizzle.removeUnusedCSS(html, {removeUnusedCSS: false})
  const withOptions = await Maizzle.removeUnusedCSS(html, {whitelist: ['.bar*']})

  t.is(enabled, enabledResult)
  t.is(disabled, html)
  t.is(withOptions, withOptionsResult)
})

test('remove unused CSS (disabled)', async t => {
  const html = `<!DOCTYPE html>
  <html>
    <head>
      <style>
        .foo {color: red}
      </style>
    </head>
    <body>
      <div class="foo">test div with some text</div>
    </body>
  </html>`

  const result = `<!DOCTYPE html>
  <html>
    <head>
      <style>
        .foo {color: red}
      </style>
    </head>
    <body>
      <div class="foo">test div with some text</div>
    </body>
  </html>`

  const disabled = await Maizzle.removeUnusedCSS(html, {removeUnusedCSS: false})
  const unset = await Maizzle.removeUnusedCSS(html)

  t.is(disabled, result)
  t.is(unset, result)
})

test('remove attributes', async t => {
  const html = await Maizzle.removeAttributes(
    `<div style="" remove keep role="article" delete-me="with-regex"></div>`,
    [
      {name: 'role', value: 'article'},
      'remove',
      {name: 'delete-me', value: /^with/}
    ]
  )

  t.is(html, '<div keep></div>')
})

test('extra attributes', async t => {
  const html = await Maizzle.applyExtraAttributes('<div />', {div: {role: 'article'}})

  t.is(html, '<div role="article"></div>')
})

test('extra attributes (disabled)', async t => {
  const html = await Maizzle.applyExtraAttributes('<img src="example.jpg">', {extraAttributes: false})

  t.is(html, '<img src="example.jpg">')
})

test('base URL (string)', async t => {
  const source = await fixture('base-url')
  const html = await Maizzle.applyBaseUrl(source, 'https://example.com/')

  t.is(html, await expected('base-url'))
})

test('base URL (object)', async t => {
  const source = await fixture('base-url')
  const html = await Maizzle.applyBaseUrl(source, {
    url: 'https://example.com/',
    allTags: true,
    styleTag: true,
    inlineCss: true
  })

  t.is(html, await expected('base-url'))
})

test('prettify', async t => {
  // `prettify: true`
  const html2 = await Maizzle.prettify('<div><p>test</p></div>', true)

  // With custom object config
  // eslint-disable-next-line
  const html = await Maizzle.prettify('<div><p>test</p></div>', {indent_inner_result: true})

  // No config
  const html3 = await Maizzle.prettify('<div><p>test</p></div>')

  // Empty object config
  const html4 = await Maizzle.prettify('<div><p>test</p></div>', {})

  t.is(html, '<div>\n  <p>test</p>\n</div>')
  t.is(html2, '<div>\n  <p>test</p>\n</div>')
  t.is(html3, '<div><p>test</p></div>')
  t.is(html4, '<div><p>test</p></div>')
})

test('minify', async t => {
  const html = await Maizzle.minify('<div>\n\n<p>\n\ntest</p></div>', {lineLengthLimit: 10})

  t.is(html, '<div><p>\ntest</p>\n</div>')
})

test('minify (disabled)', async t => {
  const html = await Maizzle.minify('<div>\n\n<p>\n\ntest</p></div>', {minify: false})

  t.is(html, '<div>\n\n<p>\n\ntest</p></div>')
})

test('replace strings', async t => {
  const html = await Maizzle.replaceStrings('initial text', {initial: 'updated'})

  t.is(html, 'updated text')
})

test('safe class names', async t => {
  const html = await Maizzle.safeClassNames('<div class="sm:text-left w-1.5">foo</div>', {'.': '_dot_'})

  t.is(html, '<div class="sm-text-left w-1_dot_5">foo</div>')
})

test('safe class names (disabled)', async t => {
  const html = await Maizzle.safeClassNames('<div class="sm:text-left">foo</div>', {safeClassNames: false})

  t.is(html, '<div class="sm:text-left">foo</div>')
})

test('six digit hex', async t => {
  const html = await Maizzle.ensureSixHEX(
    `
<div bgcolor="#000" style="color: #fff; background-color: #000">This should not change: #ffc</div>
<font color="#fff">Text</font>
    `)

  t.is(
    html.trim(),
    `
<div bgcolor="#000000" style="color: #fff; background-color: #000">This should not change: #ffc</div>
<font color="#ffffff">Text</font>
    `.trim()
  )
})

test('six digit hex (disabled)', async t => {
  const html = await Maizzle.ensureSixHEX('<td style="color: #ffc" bgcolor="#000"></td>', {sixHex: false})

  t.is(html, '<td style="color: #ffc" bgcolor="#000"></td>')
})

test('filters (default)', async t => {
  const source = await fixture('filters')
  const html = await Maizzle.withFilters(source)

  t.is(html, await expected('filters'))
})

test('filters (disabled)', async t => {
  const html = await Maizzle.withFilters('<p uppercase>test</p>', {filters: false})

  t.is(html, '<p uppercase>test</p>')
})

test('filters (tailwindcss)', async t => {
  const html = await Maizzle.withFilters(
    `<style tailwindcss>
      div {
        @apply hidden;
      }
    </style>`
  )

  t.true(html.replace(/\s/g, '').includes(`div{display:none}`))
})

test('filters (postcss)', async t => {
  const html = await Maizzle.withFilters(
    `<style postcss>
      div {
        margin-top: 1px;
        margin-right: 2px;
        margin-bottom: 3px;
        margin-left: 4px;
      }
    </style>`
  )

  t.is(html.replace(/\n {2,}/g, ''), '<style>div {margin: 1px 2px 3px 4px;}</style>')
})

test('url parameters', async t => {
  const simple = await Maizzle.addURLParams(
    `<a href="https://example.com">test</a>
      <link href="https://foo.bar">`,
    {
      bar: 'baz',
      qix: 'qux'
    }
  )

  const withOptions = await Maizzle.addURLParams(
    `<a href="example.com">test</a>
      <link href="https://foo.bar">`,
    {
      _options: {
        tags: ['a[href*="example"]'],
        strict: false,
        qs: {
          encode: true
        }
      },
      foo: '@Bar@',
      bar: 'baz'
    }
  )

  t.is(simple, `<a href="https://example.com?bar=baz&qix=qux">test</a>
      <link href="https://foo.bar">`)

  t.is(withOptions, `<a href="example.com?bar=baz&foo=%40Bar%40">test</a>
      <link href="https://foo.bar">`)
})

test('attribute to style', async t => {
  const html = `<table width="100%" height="600" align="left" bgcolor="#FFFFFF" background="https://example.com/image.jpg">
    <tr>
      <td align="center" valign="top"></td>
    </tr>
  </table>`

  const expected = `<table width="100%" height="600" align="left" bgcolor="#FFFFFF" background="https://example.com/image.jpg" style="width: 100%; height: 600px; float: left; background-color: #FFFFFF; background-image: url('https://example.com/image.jpg')">
    <tr style="">
      <td align="center" valign="top" style="text-align: center; vertical-align: top"></td>
    </tr>
  </table>`

  const html2 = `<table align="center">
    <tr>
      <td></td>
    </tr>
  </table>`

  const expected2 = `<table align="center" style="margin-left: auto; margin-right: auto">
    <tr style="">
      <td style=""></td>
    </tr>
  </table>`

  const withArray = await Maizzle.attributeToStyle(html, ['width', 'height', 'bgcolor', 'background', 'align', 'valign'])
  const withOptionBoolean = await Maizzle.attributeToStyle(html2, {inlineCSS: {attributeToStyle: true}})
  const withOptionArray = await Maizzle.attributeToStyle(html2, {inlineCSS: {attributeToStyle: ['align']}})

  t.is(withArray, expected)
  t.is(withOptionBoolean, expected2)
  t.is(withOptionArray, expected2)
})

test('prevent widows', async t => {
  const html = await Maizzle.preventWidows(`
    <!--[if mso]>
      <p>A paragraph inside an Outlook MSO comment</p>
    <![endif]-->
    <div>Text following an MSO comment</div>
  `)

  t.is(html, `
    <!--[if mso]>
      <p>A paragraph inside an Outlook MSO&nbsp;comment</p>
    <![endif]-->
    <div>Text following an MSO&nbsp;comment</div>
  `)
})

test('prevent widows (with options)', async t => {
  const html = await Maizzle.preventWidows(`
    <div no-widows>
      <p>Text following an MSO comment</p>
      <!--[if mso 15]>
        <p>A paragraph inside an Outlook MSO comment</p>
        <p>unescaped {{{ foo }}}</p>
      <![endif]-->
      <p>expression {{ foo }}</p>
      <!--[if !mso]><!-->
        <div>All Outlooks will ignore this</div>
      <!--<![endif]-->
      <p>unescaped {{{ foo }}}</p>
    </div>
    <p>Should not remove widows here</p>
  `, {
    attrName: 'no-widows',
    minWordCount: 3,
    ignore: [
      {
        heads: 'foo',
        tails: 'bar'
      }
    ]
  })

  t.is(html, `
    <div>
      <p>Text following an MSO&nbsp;comment</p>
      <!--[if mso 15]>
        <p>A paragraph inside an Outlook MSO&nbsp;comment</p>
        <p>unescaped {{{ foo }}}</p>
      <![endif]-->
      <p>expression {{ foo }}</p>
      <!--[if !mso]><!-->
        <div>All Outlooks will ignore this</div>
      <!--<![endif]-->
      <p>unescaped {{{ foo }}}</p>
    </div>
    <p>Should not remove widows here</p>
  `)
})

test('markdown (disabled)', async t => {
  const html = await Maizzle.markdown('> a quote', {markdown: false})

  t.is(html, '> a quote')
})

test('remove inlined selectors', async t => {
  const html = `<!DOCTYPE html>
  <html>
    <head>
      <style>
        img {
          border: 0;
          vertical-align: middle
        }
        .hover-text-blue:hover {
          color: #00a8ff;
        }

        .m-0 {margin: 0}

        .mb-4 {margin-bottom: 16px}

        .mt-0 {margin-top: 0}

        .remove {color: red}

        [data-ogsc] .hidden {display: none}

        #keepId {float:none}

        .foo-class {
          /* COMMENT */
          color: red;
        }

        .ignore {
          display: inline-block;
        }

        @media (max-width: 600px) {
          .ignore {color: blue}
        }
      </style>
      <style>
        .keep {margin: 0}
      </style>
    </head>
    <body>
      <div no-value id="keepId" class="remove keep ignore foo-class" style="color: red; display: inline">
        <h1 class="m-0 mb-4 mt-0 hover-text-blue" style="margin: 0 0 16px;">Title</h1>
        <img src="https://example.com/image.jpg" style="border: 0; vertical-align: middle">
        <div id="keepId" class="remove keep ignore" style="color: red; display: inline">text</div>
      </div>
    </body>
  </html>`

  const expectedHTML = `<!DOCTYPE html>
  <html>
    <head>
      <style>.hover-text-blue:hover {
          color: #00a8ff;
        }

        [data-ogsc] .hidden {display: none}

        #keepId {float:none}

        .foo-class {
          /* COMMENT */
          color: red;
        }

        @media (max-width: 600px) {
          .ignore {color: blue}
        }</style>
      <style>.keep {margin: 0}</style>
    </head>
    <body>
      <div no-value id="keepId" class="keep foo-class" style="color: red; display: inline">
        <h1 class="hover-text-blue" style="margin: 0 0 16px">Title</h1>
        <img src="https://example.com/image.jpg" style="border: 0; vertical-align: middle">
        <div id="keepId" class="keep" style="color: red; display: inline">text</div>
      </div>
    </body>
  </html>`

  const html2 = `<!DOCTYPE html>
  <html>
    <head><style>
        img {
          border: 0;
          vertical-align: middle
        }
      </style></head>
    <body>
      <img src="https://example.com/image.jpg" style="border: 0; vertical-align: middle">
    </body>
  </html>`

  const expectedNoEmptyStyleTags = `<!DOCTYPE html>
  <html>
    <head></head>
    <body>
      <img src="https://example.com/image.jpg" style="border: 0; vertical-align: middle">
    </body>
  </html>`

  const basic = await Maizzle.removeInlinedClasses(html)
  const noEmptyStyle = await Maizzle.removeInlinedClasses(html2)

  const withPostHTMLOptions = await Maizzle.removeInlinedClasses(html, {
    build: {
      posthtml: {
        options: {
          recognizeNoValueAttribute: true
        }
      }
    }
  })

  t.is(basic, expectedHTML)
  t.is(withPostHTMLOptions, expectedHTML)
  t.is(noEmptyStyle, expectedNoEmptyStyleTags)
})

test('remove inlined selectors (disabled)', async t => {
  const html = `<!DOCTYPE html>
  <html>
    <head>
      <style>
        .remove {color: red}
      </style>
    </head>
    <body>
      <div class="remove" style="color: red"></div>
    </body>
  </html>`

  const expected = `<!DOCTYPE html>
  <html>
    <head>
      <style>
        .remove {color: red}
      </style>
    </head>
    <body>
      <div class="remove" style="color: red"></div>
    </body>
  </html>`

  const result = await Maizzle.removeInlinedClasses(html, {removeInlinedClasses: false})

  t.is(result, expected)
})

test('shorthand inline css', async t => {
  const html = `
    <div style="padding-left: 2px; padding-right: 2px; padding-top: 2px; padding-bottom: 2px;">padding</div>
    <div style="margin-left: 2px; margin-right: 2px; margin-top: 2px; margin-bottom: 2px;">margin</div>
    <div style="border-width: 1px; border-style: solid; border-color: #000;">border</div>
    <p style="border-width: 1px; border-style: solid; border-color: #000;">border</p>
  `

  const expect = `
    <div style="padding: 2px;">padding</div>
    <div style="margin: 2px;">margin</div>
    <div style="border: 1px solid #000;">border</div>
    <p style="border: 1px solid #000;">border</p>
  `

  const expect2 = `
    <div style="padding: 2px;">padding</div>
    <div style="margin: 2px;">margin</div>
    <div style="border: 1px solid #000;">border</div>
    <p style="border-width: 1px; border-style: solid; border-color: #000;">border</p>
  `

  const result = await Maizzle.shorthandInlineCSS(html)
  const result2 = await Maizzle.shorthandInlineCSS(html, {tags: ['div']})

  t.is(result, expect)
  t.is(result2, expect2)
})

const test = require('ava')
const Maizzle = require('../src')
const removePlaintextTags = require('../src/transformers/plaintext')

const path = require('path')
const fs = require('fs')

const readFile = (dir, filename) => fs.promises
  .readFile(path.join(__dirname, dir, `${filename}.html`), 'utf8')
  .then(html => html.trim())

const fixture = file => readFile('fixtures/transformers', file)
const expected = file => readFile('expected/transformers', file)

test('remove inline sizes', async t => {
  const options = {
    width: ['TD'],
    height: ['TD']
  }

  const html = await Maizzle.removeInlineSizes('<td style="width:100%;height:10px;">test</td>', options)

  t.is(html, '<td style="">test</td>')
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
  const html = `<div class="foo bar px-2 py-2">test</div>`
  const css = `
    .foo {color: red}
    .bar {cursor: pointer}
    .px-2 {
      padding-left: 2px;
      padding-right: 2px;
    }
    .py-2 {
      padding-top: 2px;
      padding-bottom: 2px;
    }
  `

  const result = await Maizzle.inlineCSS(html, {
    customCSS: css,
    removeStyleTags: false,
    styleToAttribute: {
      'text-align': 'align'
    },
    applyWidthAttributes: ['TABLE'],
    applyHeightAttributes: ['TD'],
    mergeLonghand: ['div'],
    excludedProperties: ['cursor'],
    codeBlocks: {
      RB: {
        start: '<%',
        end: '%>'
      }
    }
  })

  const result2 = await Maizzle.inlineCSS(html, {
    customCSS: css,
    mergeLonghand: true
  })

  t.is(result, '<div class="foo bar px-2 py-2" style="color: red; padding: 2px;">test</div>')
  t.is(result2, '<div class="foo bar px-2 py-2" style="color: red; cursor: pointer; padding: 2px;">test</div>')
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
      <div class="foo">test div with some text</div>
    </body>
  </html>`

  const expected1 = `<!DOCTYPE html>
  <html>
    <head>
      <style>
        .foo {color: red}
        .bar-baz {color: blue}
      </style>
    </head>
    <body>
      <div class="foo">test div with some text</div>
    </body>
  </html>`

  const expected2 = `<!DOCTYPE html>
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

  const withOptions = await Maizzle.removeUnusedCSS(html, {whitelist: ['.bar*']})
  const enabled = await Maizzle.removeUnusedCSS(html, true)

  t.is(withOptions, expected1)
  t.is(enabled, expected2)
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

  const expected = `<!DOCTYPE html>
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

  t.is(disabled, expected)
  t.is(unset, expected)
})

test('remove attributes', async t => {
  const html = await Maizzle.removeAttributes(`<div style="" role="article"></div>`, [{name: 'role', value: 'article'}])

  t.is(html, '<div></div>')
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
  const source = await fixture('base-image-url')
  const html = await Maizzle.applyBaseImageUrl(source, 'https://example.com/')

  t.is(html, await expected('base-image-url'))
})

test('base URL (object)', async t => {
  const source = await fixture('base-image-url')
  const html = await Maizzle.applyBaseImageUrl(source, {
    url: 'https://example.com/',
    allTags: true,
    styleTag: true,
    inlineCss: true
  })

  t.is(html, await expected('base-image-url'))
})

test('prettify', async t => {
  // eslint-disable-next-line
  const html = await Maizzle.prettify('<div><p>test</p></div>', {indent_inner_result: true})
  const html2 = await Maizzle.prettify('<div><p>test</p></div>', true)

  t.is(html, '<div>\n  <p>test</p>\n</div>')
  t.is(html2, '<div>\n  <p>test</p>\n</div>')
})

test('prettify (disabled)', async t => {
  const html = await Maizzle.prettify('<div><p>test</p></div>', {prettify: false})

  t.is(html, '<div><p>test</p></div>')
})

test('minify', async t => {
  const html = await Maizzle.minify('<div>\n\n<p>\n\ntest</p></div>', {lineLengthLimit: 10})

  t.is(html, '<div><p>\ntest</p>\n</div>')
})

test('minify (disabled)', async t => {
  const html = await Maizzle.minify('<div>\n\n<p>\n\ntest</p></div>', {minify: false})

  t.is(html, '<div>\n\n<p>\n\ntest</p></div>')
})

test('removes plaintext tag', t => {
  let html = removePlaintextTags('<plaintext>Removed</plaintext><div>Preserved</div>')
  html = html.replace(/[^\S\r\n]+$/gm, '').trim()

  t.is(html, '<div>Preserved</div>')
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

test('transform contents (javascript)', async t => {
  const html = await Maizzle.transformContents('<div uppercase>test</div>', {uppercase: string => string.toUpperCase()})

  t.is(html, '<div>TEST</div>')
})

test('transform contents (tailwindcss)', async t => {
  const html = await Maizzle.transformContents(
    `<style tailwindcss>
      div {
        @apply hidden;
      }
    </style>`
  )

  const expected = `<style>.inline { display: inline !important
} .table { display: table !important
} .contents { display: contents !important
} .transform { transform: translate(var(--tw-translate-x), var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y)) !important
} div { display: none
}</style>`

  t.is(html, expected)
})

test('transform contents (postcss)', async t => {
  const html = await Maizzle.transformContents(
    `<style postcss>@import 'test/stubs/post.css';</style>`
  )

  const expected = `<style>div {
  margin: 1px 2px 3px 4px;
}</style>`

  t.is(html, expected)
})

test('url parameters', async t => {
  const html = await Maizzle.addURLParams('<a href="https://example.com">test</a>', {bar: 'baz', qix: 'qux'})

  t.is(html, '<a href="https://example.com?bar=baz&qix=qux">test</a>')
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
  const html = await Maizzle.preventWidows('lorem ipsum dolor')

  t.is(html, 'lorem ipsum&nbsp;dolor')
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

        @media (max-width: 600px) {
          .ignore {color: blue}
        }
      </style>
      <style>
        .keep {margin: 0}
      </style>
    </head>
    <body>
      <div id="keepId" class="remove keep ignore" style="color: red; display: inline">
        <h1 class="m-0 mb-4 mt-0 hover-text-blue" style="margin: 0 0 16px;">Title</h1>
        <img src="https://example.com/image.jpg" style="border: 0; vertical-align: middle">
        <div id="keepId" class="remove keep ignore" style="color: red; display: inline">text</div>
      </div>
    </body>
  </html>`

  const expected = `<!DOCTYPE html>
  <html>
    <head>
      <style>
        .hover-text-blue:hover {
          color: #00a8ff;
        }

        [data-ogsc] .hidden {display: none}

        #keepId {float:none}

        @media (max-width: 600px) {
          .ignore {color: blue}
        }
      </style>
      <style>
        .keep {margin: 0}
      </style>
    </head>
    <body>
      <div id="keepId" class="keep ignore" style="color: red; display: inline">
        <h1 class="hover-text-blue" style="margin: 0 0 16px">Title</h1>
        <img src="https://example.com/image.jpg" style="border: 0; vertical-align: middle">
        <div id="keepId" class="keep ignore" style="color: red; display: inline">text</div>
      </div>
    </body>
  </html>`

  const result = await Maizzle.removeInlinedClasses(html)

  t.is(result, expected)
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

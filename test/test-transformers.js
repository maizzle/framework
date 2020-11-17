const test = require('ava')
const Maizzle = require('../src')
const removePlaintextTags = require('../src/transformers/plaintext')

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

  t.is(html, '<td style="" bgcolor="red">test</td>')
})

test('remove inline background-color (with tags)', async t => {
  const html = await Maizzle.removeInlineBgColor(`<table style="background-color: red"><tr><td style="background-color: red">test</td></tr></table>`, ['table'])

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
    enabled: true,
    customCSS: css,
    removeStyleTags: false,
    styleToAttribute: {
      'text-align': 'align'
    },
    applyWidthAttributes: ['TABLE'],
    applyHeightAttributes: ['TD'],
    mergeLonghand: {
      enabled: true,
      tags: ['div']
    },
    excludedProperties: ['cursor'],
    codeBlocks: {
      RB: {
        start: '<%',
        end: '%>'
      }
    }
  })

  t.is(result, '<div class="foo bar px-2 py-2" style="color: red; padding: 2px;">test</div>')
})

test('remove unused CSS', async t => {
  const html = `
  <!DOCTYPE html>
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
  </html>
  `

  const result = await Maizzle.removeUnusedCSS(html, {whitelist: ['.bar*']})

  t.is(result, `<!DOCTYPE html>
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
  </html>`)
})

test('remove attributes', async t => {
  const html = await Maizzle.removeAttributes(`<div style="" role="article"></div>`, [{name: 'role', value: 'article'}])

  t.is(html, '<div></div>')
})

test('extra attributes', async t => {
  const html = await Maizzle.applyExtraAttributes('<div />', {div: {role: 'article'}})

  t.is(html, '<div role="article"></div>')
})

test('base image URL', async t => {
  const html = await Maizzle.applyBaseImageUrl('<img src="example.jpg">', 'https://example.com/')

  t.is(html, '<img src="https://example.com/example.jpg">')
})

test('prettify', async t => {
  // eslint-disable-next-line
  const html = await Maizzle.prettify('<div><p>test</p></div>', {indent_inner_result: true})

  t.is(html, '<div>\n  <p>test</p>\n</div>')
})

test('minify', async t => {
  const html = await Maizzle.minify('<div>\n\n<p>\n\ntest</p></div>', {lineLengthLimit: 10})
  const expected = '<div><p>\ntest</p>\n</div>'

  t.is(html, expected)
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
  const html = await Maizzle.ensureSixHEX('<td style="color: #ffc" bgcolor="#000"></td>')

  t.is(html, '<td style="color: #ffffcc" bgcolor="#000000"></td>');
})

test('transform contents', async t => {
  const html = await Maizzle.transformContents('<div uppercase>test</div>', {uppercase: string => string.toUpperCase()})

  t.is(html, '<div>TEST</div>')
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

  const expectedWithAttrs = `<table width="100%" height="600" align="left" bgcolor="#FFFFFF" background="https://example.com/image.jpg" style="width: 100%">
    <tr style="">
      <td align="center" valign="top" style=""></td>
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

  const result = await Maizzle.attributeToStyle(html, ['width', 'height', 'bgcolor', 'background', 'align', 'valign'])
  const result2 = await Maizzle.attributeToStyle(html2, ['align'])
  const withAttrs = await Maizzle.attributeToStyle(html, ['width'])

  t.is(result, expected)
  t.is(result2, expected2)
  t.is(withAttrs, expectedWithAttrs)
})

test('prevent widows', async t => {
  const html = await Maizzle.preventWidows('lorem ipsum dolor')

  t.is(html, 'lorem ipsum&nbsp;dolor')
})

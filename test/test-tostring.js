const test = require('ava')
const Maizzle = require('../src')

const path = require('path')
const fs = require('fs')

const readFile = (dir, filename) => fs.promises
  .readFile(path.join(__dirname, dir, `${filename}.html`), 'utf8')
  .then(html => html.trim())

const fixture = file => readFile('fixtures', file)
const expected = file => readFile('expected', file)

const renderString = (string, options = {}) => Maizzle.render(string, options).then(({html}) => html)

test('compiles HTML string if no options are passed', async t => {
  const source = await fixture('basic')

  const html = await renderString(source)

  t.is(html, source)
})

test('uses environment config file(s) if available', async t => {
  const source = await fixture('useConfig')

  const html = await renderString(source, {maizzle: {env: 'maizzle-ci'}})

  t.is(html, await expected('useConfig'))
})

test('throws if first argument is not an HTML string', async t => {
  await t.throwsAsync(async () => {
    await renderString()
  }, {instanceOf: TypeError, message: 'first argument must be an HTML string, received undefined'})
})

test('throws if first argument is an empty string', async t => {
  await t.throwsAsync(async () => {
    await renderString('')
  }, {instanceOf: RangeError, message: 'received empty string'})
})

test('runs the `beforeRender` event', async t => {
  const html = await renderString(`<div>{{ page.foo }}</div>`, {
    beforeRender(html, config) {
      config.foo = 'bar'

      return html
    }
  })

  t.is(html, `<div>bar</div>`)
})

test('runs the `afterRender` event', async t => {
  const result = await renderString(`<div>foo</div>`, {
    afterRender(html, config) {
      config.replaceStrings = {
        foo: 'baz'
      }

      return html
    }
  })

  t.is(result, `<div>baz</div>`)
})

test('runs the `afterTransformers` event', async t => {
  const result = await renderString(`<div>foo</div>`, {
    maizzle: {
      title: 'bar'
    },
    afterTransformers(html, config) {
      return html.replace('foo', config.title)
    }
  })

  t.is(result, `<div>bar</div>`)
})

test('locals work when defined in all supported places', async t => {
  const result = await renderString(`{{ page.one }}, {{ two }}, {{ three }}`, {
    maizzle: {
      one: 1,
      build: {
        posthtml: {
          expressions: {
            locals: {
              two: 2
            }
          }
        }
      },
      locals: {
        three: 3
      }
    }
  })

  t.is(result, `1, 2, 3`)
})

test('prevents overwriting page object', async t => {
  const result = await renderString(`{{ page.one }}, {{ two }}, {{ three }}`, {
    maizzle: {
      one: 1,
      build: {
        posthtml: {
          expressions: {
            locals: {
              page: {
                two: 2
              }
            }
          }
        }
      },
      locals: {
        page: {
          three: 3
        }
      }
    }
  })

  t.is(result, `1, undefined, undefined`)
})

test('preserves css in marked style tags (tailwindcss)', async t => {
  const source = `<html>
    <head>
      <style tailwindcss preserve>
        div {
          @apply uppercase;
        }
        [data-ogsc] .inexistent {
          color: #ef4444;
        }
        div > u + .body .gmail-android-block {
          display: block !important;
        }
        u + #body a {
          color: inherit;
        }
      </style>
    </head>
    <body>
      <div>test</div>
    </body>
  </html>`

  const html = await renderString(source, {
    // So that we don't compile twice
    tailwind: {
      compiled: ''
    }
  })

  t.true(html.includes('[data-ogsc] .inexistent'))
  t.true(html.includes('div > u + .body .gmail-android-block'))
  t.true(html.includes('u + #body a'))
})

test('@import css files in marked style tags', async t => {
  const source = `<style postcss>@import "test/stubs/post.css";</style>`
  const html = await renderString(source)

  t.is(html, `<style>div {
  margin-top: 1px;
  margin-right: 2px;
  margin-bottom: 3px;
  margin-left: 4px;
}</style>`)
})

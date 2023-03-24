const test = require('ava')
const Maizzle = require('../src')

const renderString = (string, options = {}) => Maizzle.render(string, options).then(({html}) => html)

test('uses environment config file(s) if available', async t => {
  const source = `<div class="inline">{{ page.mail }}</div>`

  const html = await renderString(source, {
    maizzle: {
      mail: 'puzzle'
    }
  })

  t.is(html, '<div class="inline">puzzle</div>')
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
  const html = await renderString(`<div class="inline">{{ page.foo }}</div>`, {
    beforeRender(html, config) {
      config.foo = 'bar'

      return html
    }
  })

  t.is(html, `<div class="inline">bar</div>`)
})

test('runs the `afterRender` event', async t => {
  const result = await renderString(`<div class="inline">foo</div>`, {
    afterRender(html, config) {
      config.replaceStrings = {
        foo: 'baz'
      }

      return html
    }
  })

  t.is(result, `<div class="inline">baz</div>`)
})

test('runs the `afterTransformers` event', async t => {
  const result = await renderString(`<div class="inline">foo</div>`, {
    maizzle: {
      title: 'bar'
    },
    afterTransformers(html, config) {
      return html.replace('foo', config.title)
    }
  })

  t.is(result, `<div class="inline">bar</div>`)
})

test('locals work when defined in all supported places', async t => {
  const result = await renderString(`{{ page.one }}, {{ two }}, {{ three }}, {{ inline }}`, {
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

  t.is(result, `1, 2, 3, undefined`)
})

test.serial('prevents overwriting page object', async t => {
  const result = await renderString(`{{ page.one }}, {{ two }}, {{ three }}, {{ inline }}`, {
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

  t.is(result, `1, undefined, undefined, undefined`)
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
    maizzle: {
      removeUnusedCSS: true
    },
    // So that we don't compile twice
    tailwind: {
      compiled: ''
    }
  })

  t.true(html.replace(/[\n\s\r]+/g, '').includes('div{text-transform:uppercase'))
  t.true(html.includes('div > u + .body .gmail-android-block'))
  t.true(html.includes('[data-ogsc] .inexistent'))
  t.true(html.includes('u + #body a'))
})

test('@import css files in marked style tags', async t => {
  const source = `<style postcss>@import "test/stubs/post.css";</style>`
  const html = await renderString(source, {
    maizzle: {
      shorthandCSS: true
    }
  })

  t.is(html.replace(/\n {2,}/g, ''), `<style>div {margin: 1px 2px 3px 4px;\n}</style>`)
})

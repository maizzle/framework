const test = require('ava')
const Maizzle = require('../src')

const path = require('path')
const {readFileSync} = require('fs')

const fixture = file => readFileSync(path.join(__dirname, 'fixtures', `${file}.html`), 'utf8')
const expected = file => readFileSync(path.join(__dirname, 'expected', `${file}.html`), 'utf8')

const renderString = (string, options = {}) => Maizzle.render(string, options).then(({html}) => html)

test('compiles HTML string if no options are passed', async t => {
  const source = fixture('basic')

  const html = await renderString(source)

  t.is(html, source)
})

test('inheritance', async t => {
  let html = await renderString(fixture('inheritance'))
  html = html.replace(/[^\S\r\n]+$/gm, '').trim()

  t.is(html, expected('inheritance').trim())
})

test('throws if first argument is not an HTML string', async t => {
  await t.throwsAsync(async () => {
    await renderString(false)
  }, {instanceOf: TypeError, message: 'first argument must be an HTML string, received false'})
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

test('multiple locals', async t => {
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

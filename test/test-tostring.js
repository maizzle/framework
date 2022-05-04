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

test('uses environment config file(s) if available', async t => {
  const source = fixture('useConfig')

  const html = await renderString(source, {maizzle: {env: 'maizzle-ci'}})

  t.is(html, expected('useConfig'))
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

test('preserves css in marked style tags', async t => {
  const html = await renderString(fixture('preserve-css'), {
    // So that we don't compile twice
    tailwind: {
      compiled: ''
    }
  })

  t.is(html, expected('preserve-css'))
})

test('@import css files in style tags', async t => {
  const html = await renderString(fixture('atimport-in-style'), {
    tailwind: {
      compiled: ''
    }
  })

  t.is(html, expected('atimport-in-style'))
})

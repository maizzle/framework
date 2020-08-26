const test = require('ava')
const Maizzle = require('../src')

const {join} = require('path')
const {readFileSync} = require('fs')

const fixture = file => readFileSync(join(__dirname, 'fixtures', `${file}.html`), 'utf8')
const expected = file => readFileSync(join(__dirname, 'expected', `${file}.html`), 'utf8')

const renderString = (string, options = {}) => Maizzle.render(string, options).then(html => html)

test('compiles HTML string if no options are passed', async t => {
  let html = await renderString(fixture('basic'))
  html = html.replace(/[^\S\r\n]+$/gm, '').trim()

  t.is(html, expected('basic').trim())
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
    beforeRender(config) {
      config.foo = 'bar'
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
      config: {
        title: 'bar'
      }
    },
    afterTransformers(html, config) {
      return html.replace('foo', config.title)
    }
  })

  t.is(result, `<div>bar</div>`)
})

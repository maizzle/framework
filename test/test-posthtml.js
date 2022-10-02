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

test('layouts', async t => {
  const source = `---
greeting: Hello
---

<extends src="test/stubs/layouts/basic.html">
  <block name="template">
    Front matter variable: {{ page.greeting }}
  </block>
</extends>`

  const html = await renderString(source, {
    maizzle: {
      greeting: 'Hello'
    }
  })

  t.is(html.trim(), `Front matter variable: Hello`)
})

test('inheritance when extending a template', async t => {
  const source = `---
template: second
---

<extends src="test/stubs/template.html">
  <block name="button">Child in second.html</block>
</extends>`

  let html = await renderString(source)

  html = html.replace(/[^\S\r\n]+$/gm, '').trim()

  t.is(html, `Parent
    Child in second.html`)
})

test('components', async t => {
  const source = `<component
  src="test/stubs/components/component.html"
  text="Example"
  locals='{
    "foo": "bar"
  }'
>
Variable from page: [[ page.env ]]

  <component
    src="test/stubs/components/component.html"
    text="Nested component"
    locals='{
      "foo": "bar (nested)"
    }'
  >
Variable from page (nested): [[ page.env ]]
  </component>
</component>`

  const options = {
    maizzle: {
      env: 'prod',
      build: {
        components: {
          expressions: {
            delimiters: ['[[', ']]']
          }
        }
      }
    }
  }

  const html = await renderString(source, options)

  t.is(html.trim(), `Variable from attribute: Example

Variable from locals attribute: bar


Variable from page: prod

  Variable from attribute: Nested component

Variable from locals attribute: bar (nested)


Variable from page (nested): prod`)
})

test('fetch component', async t => {
  const source = await fixture('posthtml/fetch')
  const options = {
    maizzle: {
      env: 'maizzle-ci',
      build: {
        posthtml: {
          expressions: {
            delimiters: ['[[', ']]']
          }
        }
      }
    }
  }

  let html = await renderString(source, options)
  html = html.replace(/[^\S\r\n]+$/gm, '')

  t.is(html.trim(), await expected('posthtml/fetch'))
})

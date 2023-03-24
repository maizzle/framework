const test = require('ava')
const {render, prettify} = require('../src')

const path = require('path')
const fs = require('fs')

const readFile = (dir, filename) => fs.promises
  .readFile(path.join(__dirname, dir, `${filename}.html`), 'utf8')
  .then(html => html.trim())

const fixture = file => readFile('fixtures', file)
const expected = file => readFile('expected', file)

const renderString = (string, options = {}) => render(string, options).then(({html}) => html)

test('layouts (legacy)', async t => {
  const source = `---
greeting: Hello
---

<extends src="test/stubs/layouts/legacy.html">
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

test('inheritance when extending a template (legacy)', async t => {
  const source = `---
template: second
---

<extends src="test/stubs/template-legacy.html">
  <block name="button">Child in second.html</block>
</extends>`

  let html = await renderString(source)

  html = html.replace(/[^\S\r\n]+$/gm, '').trim()

  t.is(html, `Parent
    Child in second.html`)
})

test('components (legacy)', async t => {
  const source = await fixture('components/backwards-compatibility')

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

  const html = await renderString(source, options)

  t.is(html.replace(/\n+/g, '\n').trim(), await expected('components/backwards-compatibility'))
})

test('fetch component', async t => {
  const source = `<extends src="test/stubs/layouts/legacy.html">
    <block name="template">
      <fetch url="test/stubs/data.json">
        <each loop="user in response">[[ user.name + (loop.last ? '' : ', ') ]]</each>
      </fetch>
    </block>
  </extends>`

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

  const html = await renderString(source, options)

  t.is(html.trim(), 'Leanne Graham, Ervin Howell, Clementine Bauch')
})

test.serial('components', async t => {
  const source = await fixture('components/kitchen-sink')

  const options = {
    maizzle: {
      env: 'maizzle-ci',
      build: {
        components: {
          folders: ['test/stubs/layouts', 'test/stubs/components']
        }
      }
    },
    beforeRender(html, config) {
      config.foo = 'bar'

      return html
    }
  }

  const html = await renderString(source, options)

  t.is(
    await prettify(html, {ocd: true}),
    await expected('components/kitchen-sink')
  )
})

const test = require('ava')
const {render} = require('../src')

const renderString = (string, options = {}) => render(string, options).then(({html}) => html)

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
<p class="hidden">Variable from page: [[ page.env ]]</p>

  <component
    src="test/stubs/components/component.html"
    text="Nested component"
    locals='{
      "foo": "bar (nested)"
    }'
  >
<p>Variable from page (nested): [[ page.env ]]</p>
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

  t.is(html.trim(), `<p>Variable from attribute: Example</p>

<p>Variable from locals attribute: bar</p>


<p class="hidden">Variable from page: prod</p>

  <p>Variable from attribute: Nested component</p>

<p>Variable from locals attribute: bar (nested)</p>


<p>Variable from page (nested): prod</p>`)
})

test('fetch component', async t => {
  const source = `<extends src="test/stubs/layouts/basic.html">
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

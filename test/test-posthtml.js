const test = require('ava')
const Maizzle = require('../src')

const path = require('path')
const {readFileSync} = require('fs')

const fixture = file => readFileSync(path.join(__dirname, 'fixtures', `${file}.html`), 'utf8')
const expected = file => readFileSync(path.join(__dirname, 'expected', `${file}.html`), 'utf8')

const renderString = (string, options = {}) => Maizzle.render(string, options).then(({html}) => html)

test('layouts', async t => {
  const source = fixture('posthtml/layout')

  const html = await renderString(source, {maizzle: {env: 'maizzle-ci'}})

  t.is(html.trim(), expected('posthtml/layout').trim())
})

test('inheritance when extending a template', async t => {
  let html = await renderString(fixture('posthtml/extend-template'))
  html = html.replace(/[^\S\r\n]+$/gm, '').trim()

  t.is(html, expected('posthtml/extend-template').trim())
})

test('components', async t => {
  const source = fixture('posthtml/component')
  const options = {
    maizzle: {
      env: 'maizzle-ci',
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

  t.is(html.trim(), expected('posthtml/component').trim())
})

test('fetch component', async t => {
  const source = fixture('posthtml/fetch')
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

  t.is(html.trim(), expected('posthtml/fetch').trim())
})

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
  const source = await fixture('posthtml/layout')

  const html = await renderString(source, {maizzle: {env: 'maizzle-ci'}})

  t.is(html.trim(), await expected('posthtml/layout'))
})

test('inheritance when extending a template', async t => {
  const source = await fixture('posthtml/extend-template')
  let html = await renderString(source)

  html = html.replace(/[^\S\r\n]+$/gm, '').trim()

  t.is(html, await expected('posthtml/extend-template'))
})

test('components', async t => {
  const source = await fixture('posthtml/component')
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

  t.is(html.trim(), await expected('posthtml/component'))
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

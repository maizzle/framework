const test = require('ava')
const Maizzle = require('../src')

const {join} = require('path')
const {readFileSync} = require('fs')

const fixture = file => readFileSync(join(__dirname, 'fixtures', `${file}.html`), 'utf8')
const expected = file => readFileSync(join(__dirname, 'expected', `${file}.html`), 'utf8')

const clean = html => html.replace(/[^\S\r\n]+$/gm, '').trim()
const env = {maizzle: {config: {env: 'node'}}}

const renderString = (string, options = {}) => Maizzle.render(string, {...env, ...options}).then(html => html)

const processFile = (t, name, options = {}, log = false) => {
  return renderString(fixture(name), {...env, ...options})
    .then(result => log ? console.log(result) : clean(result))
    .then(html => t.is(html, expected(name).trim()))
}

test('It compiles HTML string if no options are passed', t => {
  return processFile(t, 'basic')
})

test('It throws if first argument is not an HTML string', async t => {
	await t.throwsAsync(async () => {
		await renderString(false)
	}, {instanceOf: TypeError, message: 'first argument must be an HTML string, received false'})
})

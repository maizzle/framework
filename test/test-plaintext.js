const test = require('ava')
const Plaintext = require('../src/generators/plaintext')

const html = '<p>Test <span>plaintext</span></p>'

test('It throws if a file destination is not provided', async t => {
  await t.throwsAsync(async () => {
    await Plaintext.prepare(html)
  }, {instanceOf: TypeError, message: 'The "path" argument must be of type string. Received undefined'})
})

test('It prepares the plaintext object when given HTML and a file destination', async t => {
  const result = await Plaintext.prepare(html, 'build_production/index.txt')
  t.is(result.plaintext, 'Test plaintext')
  t.is(result.destination, 'build_production\\index.txt')
})

test('It uses the config permalink for the destination', async t => {
  const result = await Plaintext.prepare(html, 'build_production/index.txt', {permalink: 'custom/location/index.txt'})
  t.is(result.destination, 'custom\\location\\index.txt')
})

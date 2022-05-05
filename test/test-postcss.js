const test = require('ava')
const PostCSS = require('../src/generators/postcss')

test('throws on processing error', async t => {
  await t.throwsAsync(async () => {
    await PostCSS.process(null, {})
  }, {instanceOf: Error, message: 'PostCSS processing failed'})
})

const test = require('ava')
const path = require('node:path')
const h = require('../src/utils/helpers')

test('requires an uncached module', t => {
  const helpers = h.requireUncached(path.resolve(process.cwd(), 'src/utils/helpers'))
  t.is(typeof helpers.requireUncached, 'function')
})

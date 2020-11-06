const test = require('ava')
const path = require('path')
const {requireUncached} = require('../src/utils/helpers')

test('requires an uncached module', t => {
  const helpers = requireUncached(path.resolve(process.cwd(), 'src/utils/helpers'))
  t.is(typeof helpers.requireUncached, 'function')
})

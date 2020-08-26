const test = require('ava')
const path = require('path')
const Utils = require('../src/utils/helpers')

test('requires an uncached module', t => {
  const helpers = Utils.requireUncached(path.resolve(process.cwd(), 'src/utils/helpers'))
  t.is(typeof helpers.requireUncached, 'function')
})

test('gets nested object value using dot notation', t => {
  const foo = {
    bar: {
      baz: 'qux'
    }
  }

  const baz = Utils.getPropValue(foo, 'bar.baz')
  const bax = Utils.getPropValue({}, 'bar.baz')

  t.is(baz, 'qux')
  t.is(typeof bax, 'undefined')
})

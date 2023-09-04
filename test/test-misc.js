const test = require('ava')
const path = require('path')
const h = require('../src/utils/helpers')

test('requires an uncached module', t => {
  const helpers = h.requireUncached(path.resolve(process.cwd(), 'src/utils/helpers'))
  t.is(typeof helpers.requireUncached, 'function')
})

test('merges multiple objects containing arrays', t => {
  const object1 = {foo: 'bar', arr: [1, 2]}
  const object2 = {arr: [3, 4], baz: 'qux'}
  const object3 = {what: 'ever', arr: [5, 6]}
  const merged = h.merge(object1, object2, object3)

  t.deepEqual(merged, {
    arr: [1, 2, 3, 4, 5, 6],
    baz: 'qux',
    foo: 'bar',
    what: 'ever'
  })
})

test('returns object when less than two objects are provided', t => {
  const object = {arr: [1, 2]}
  const merged = h.merge(object)

  t.deepEqual(merged, object)
})

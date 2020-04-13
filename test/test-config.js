const test = require('ava')
const Config = require('../src/generators/config')

test('It throws if a config could not be loaded for the specified environment', async t => {
  await t.throwsAsync(async () => {
    await Config.getMerged('production')
  }, {instanceOf: Error, message: `could not load 'config.production.js'`})
})

test('It throws if env name is not a string', async t => {
  await t.throwsAsync(async () => {
    await Config.getMerged(false)
  }, {instanceOf: TypeError, message: `env name must be a string, received false`})
})

test('It returns the merged config', async t => {
  const config = await Config.getMerged()
  t.is(config.env, 'local')
})

const test = require('ava')
const Config = require('../src/generators/config')

test('returns the merged config', async t => {
  const config = await Config.getMerged('maizzle-ci')
  t.is(config.env, 'maizzle-ci')
})

test('throws if env name is not a string', async t => {
  await t.throwsAsync(async () => {
    await Config.getMerged(false)
  }, {instanceOf: TypeError, message: `env name must be a string, received boolean(false)`})
})

test('throws if a config could not be loaded for the specified environment', async t => {
  await t.throwsAsync(async () => {
    await Config.getMerged('fake')
  }, {instanceOf: Error, message: `could not load config.fake.js`})
})

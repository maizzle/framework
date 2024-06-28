const test = require('ava')
const Config = require('../src/generators/config')

test('returns the merged config', async t => {
  const config = await Config.getMerged('maizzle-ci')
  t.is(config.env, 'maizzle-ci')
})

test('throws if env name is not a string', async t => {
  await t.throwsAsync(async () => {
    await Config.getMerged(false)
  }, {instanceOf: TypeError, message: 'env name must be a string, received boolean(false)'})
})

test('throws if a config could not be loaded for the specified environment', async t => {
  await t.throwsAsync(async () => {
    await Config.getMerged('fake')
  }, {instanceOf: Error, message: 'Failed to load config file for \`fake\` environment, do you have one of these files in your project root?\n\n./maizzle.config.fake.js\n./maizzle.config.fake.cjs\n./config.fake.js\n./config.fake.cjs'})
})

test('supports maizzle.config.js file names', async t => {
  const config = await Config.getMerged('test')
  t.is(config.file, 'maizzle.config.test.js')
})

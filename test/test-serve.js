const test = require('ava')
const fs = require('fs-extra')
const Maizzle = require('../src')

test.beforeEach(t => {
  t.context.folder = '_temp_' + Math.random().toString(36).slice(2, 9)
  t.context.log = console.log()
})

test.afterEach.always(async t => {
  if (t.context.folder) {
    await fs.remove(t.context.folder)
    t.context.folder = undefined
  }
})

test('throws if it cannot spin up local development server', async t => {
  // Should throw because there are no template sources in `build.templates`
  await t.throwsAsync(async () => {
    await Maizzle.serve('local', {})
  }, {instanceOf: Error})
})

test('local server does not compile unwanted file types', async t => {
  await Maizzle.serve('local', {
    build: {
      console: {
        clear: true
      },
      browsersync: {
        ui: false
      },
      templates: {
        source: 'test/stubs/templates',
        destination: {
          path: `${t.context.folder}`
        }
      }
    },
    events: {
      beforeCreate(config) {
        config.foo = 'bar'
      }
    }
  })

  t.true(await fs.pathExists(`${t.context.folder}`))
  t.true(await fs.pathExists(`${t.context.folder}/2.test`))

  // Tests watching changes to files
  await fs.outputFile('test/stubs/templates/2.html', '<div class="inline">html modified</div>')
  t.is(await fs.readFile('test/stubs/templates/2.html', 'utf8'), '<div class="inline">html modified</div>')

  // Don't trigger rebuilds on files not in `filetypes`
  await fs.outputFile('test/stubs/templates/2.test', 'test')
  t.is(await fs.readFile('test/stubs/templates/2.test', 'utf8'), 'test')
})

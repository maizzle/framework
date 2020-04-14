const test = require('ava')
const fs = require('fs-extra')
const Maizzle = require('../src')

test.beforeEach(t => {
  t.context.folder = '_temp_' + Math.random().toString(36).slice(2, 9)
  t.context.log = console.log()
})

test('throws if config cannot be computed', async t => {
  await t.throwsAsync(async () => {
    await Maizzle.build('production')
  }, {instanceOf: Error, message: `could not load 'config.production.js'`})
})

test('throws if no templates found', async t => {
  await t.throwsAsync(async () => {
    await Maizzle.build('local')
  }, {instanceOf: Error, message: 'no templates found'})
})

test('outputs files at the correct location', async t => {
  const files = await Maizzle.build('production', {
    build: {
      destination: {
        path: t.context.folder
      },
      templates: {
        root: 'test/stubs/templates'
      }
    }
  })

  t.is(files.length, 2)
  t.true(fs.pathExistsSync(t.context.folder))
  await fs.remove(t.context.folder)
})

test('outputs files at the correct location when multiple template sources are used', async t => {
  const files = await Maizzle.build('production', {
    build: {
      fail: 'silent',
      destination: {
        path: t.context.folder
      },
      templates: {
        root: ['test/stubs/templates', 'test/stubs/empty']
      }
    }
  })

  t.is(files.length, 3)
  t.true(fs.pathExistsSync(t.context.folder))
  await fs.remove(t.context.folder)
})

test('processes all files in the `filetypes` option', async t => {
  const files = await Maizzle.build('production', {
    build: {
      destination: {
        path: t.context.folder
      },
      templates: {
        extensions: ['html', 'mzl'],
        root: 'test/stubs/templates'
      }
    }
  })

  t.is(files.length, 2)
  t.true(fs.pathExistsSync(t.context.folder))
  await fs.remove(t.context.folder)
})

test('outputs files with the correct extension', async t => {
  await Maizzle.build('production', {
    build: {
      destination: {
        path: t.context.folder,
        extension: 'blade.php'
      },
      templates: {
        root: 'test/stubs/templates'
      }
    }
  })

  t.is(fs.readdirSync(t.context.folder).includes('1.blade.php'), true)
  await fs.remove(t.context.folder)
})

test('outputs plaintext files if option is enabled', async t => {
  const files = await Maizzle.build('production', {
    plaintext: true,
    build: {
      destination: {
        path: t.context.folder
      },
      templates: {
        root: 'test/stubs/templates'
      }
    }
  })

  const expected = files.filter(file => file.includes('.txt'))

  t.is(expected.length, 2)
  await fs.remove(t.context.folder)
})

test('copies assets to destination', async t => {
  await Maizzle.build('production', {
    build: {
      assets: {
        source: 'test/stubs/assets',
        destination: 'images'
      },
      destination: {
        path: t.context.folder
      },
      templates: {
        root: 'test/stubs/templates'
      }
    }
  })

  t.is(fs.pathExistsSync(`${t.context.folder}/images`), true)
  await fs.remove(t.context.folder)
})

test('throws and exits if a template cannot be rendered and `fail` option is undefined', async t => {
  await t.throwsAsync(async () => {
    await Maizzle.build('production', {
      build: {
        destination: {
          path: t.context.folder
        },
        templates: {
          root: 'test/stubs/empty'
        }
      }
    })
  }, {instanceOf: RangeError, message: 'received empty string'})

  await fs.remove(t.context.folder)
})

test('warns if a template cannot be rendered and `fail` option is `verbose`', async t => {
  const files = await Maizzle.build('production', {
    build: {
      fail: 'verbose',
      destination: {
        path: t.context.folder
      },
      templates: {
        root: 'test/stubs/empty'
      }
    }
  })

  t.true(files[0].includes('empty.html'))

  await fs.remove(t.context.folder)
})

test('warns if a template cannot be rendered and `fail` option is `silent`', async t => {
  const files = await Maizzle.build('production', {
    build: {
      fail: 'silent',
      destination: {
        path: t.context.folder
      },
      templates: {
        root: 'test/stubs/empty'
      }
    }
  })

  t.true(files[0].includes('empty.html'))

  await fs.remove(t.context.folder)
})

test('runs the `beforeCreate` event', async t => {
  const files = await Maizzle.build('production', {
    build: {
      destination: {
        path: t.context.folder
      },
      templates: {
        root: 'test/stubs/events'
      }
    },
    events: {
      beforeCreate(config) {
        config.foo = 'bar'
      }
    }
  })

  const html = fs.readFileSync(files[0], 'utf8').trim()

  t.is(html, 'Foo is bar')

  await fs.remove(t.context.folder)
})

test('runs the `afterBuild` event', async t => {
  const files = await Maizzle.build('production', {
    build: {
      destination: {
        path: t.context.folder
      },
      templates: {
        root: 'test/stubs/templates'
      }
    },
    events: {
      afterBuild(files) {
        t.context.afterBuild = files
      }
    }
  })

  t.deepEqual(t.context.afterBuild, files)

  await fs.remove(t.context.folder)
})


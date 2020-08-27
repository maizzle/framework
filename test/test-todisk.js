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
    delete t.context.folder
  }
})

test('throws if config cannot be computed', async t => {
  await t.throwsAsync(async () => {
    await Maizzle.build('production')
  }, {instanceOf: Error, message: `could not load 'config.production.js'`})
})

test('throws if no templates found', async t => {
  await t.throwsAsync(async () => {
    await Maizzle.build('local', {
      build: {
        fail: 'silent',
        destination: {
          path: t.context.folder
        },
        templates: {
          root: 'test/stubs/assets'
        }
      }
    })
  }, {instanceOf: Error, message: 'no templates found'})
})

test('outputs files at the correct location', async t => {
  const files = await Maizzle.build('production', {
    build: {
      fail: 'silent',
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

  t.is(files.length, 2)
  t.true(fs.pathExistsSync(t.context.folder))
})

test('processes all files in the `filetypes` option', async t => {
  const files = await Maizzle.build('production', {
    build: {
      fail: 'silent',
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
})

test('outputs files with the correct extension', async t => {
  await Maizzle.build('production', {
    build: {
      fail: 'silent',
      destination: {
        path: t.context.folder,
        extension: 'blade.php'
      },
      templates: {
        root: 'test/stubs/templates'
      }
    }
  })

  t.true(fs.readdirSync(t.context.folder).includes('1.blade.php'))
})

test('outputs plaintext files if option is enabled', async t => {
  const files = await Maizzle.build('production', {
    fail: 'silent',
    plaintext: true,
    build: {
      destination: {
        path: t.context.folder
      },
      templates: {
        root: 'test/stubs/plaintext'
      }
    }
  })

  const plaintext = files.filter(file => file.includes('.txt'))
  const html = files.filter(file => file.includes('.html'))
  const plaintextContent = await fs.readFile(plaintext[0], 'utf8')
  const htmlContent = await fs.readFile(html[0], 'utf8')

  t.is(plaintext.length, 1)
  t.is(plaintextContent, 'Show in HTML\nShow in plaintext')
  t.is(htmlContent, '<div>Show in HTML</div>\n\n')
})

test('copies assets to destination', async t => {
  await Maizzle.build('production', {
    build: {
      fail: 'silent',
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
})

test('runs the `beforeCreate` event', async t => {
  const files = await Maizzle.build('production', {
    build: {
      fail: 'silent',
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
})

test('runs the `afterBuild` event', async t => {
  const files = await Maizzle.build('production', {
    build: {
      fail: 'silent',
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
})

test('supports multiple asset paths', async t => {
  await Maizzle.build('production', {
    build: {
      fail: 'silent',
      destination: {
        path: t.context.folder
      },
      templates: {
        root: 'test/stubs/templates'
      },
      assets: {
        source: ['test/stubs/assets', 'test/stubs/plaintext', 'test/stubs/invalid'],
        destination: 'extras'
      }
    }
  })

  t.true(fs.existsSync(`${t.context.folder}/extras/foo.bar`))
  t.true(fs.existsSync(`${t.context.folder}/extras/plaintext.html`))
  t.false(fs.existsSync(`${t.context.folder}/extras/invalid`))
})

test('spins up local development server', async t => {
  await fs.copy('test/stubs/templates', 'src/templates')

  await Maizzle.serve({
    build: {
      templates: {
        root: 'test/stubs/templates'
      }
    }
  })

  t.true(fs.existsSync('build_local'))

  await fs.remove('build_local')
  await fs.remove('src/templates')
})

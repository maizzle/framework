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

test('skips if no templates found', async t => {
  const files = await Maizzle.build('production', {
    build: {
      fail: 'silent',
      templates: {
        source: 'test/stubs/templates',
        filetypes: 'fake',
        destination: {
          path: t.context.folder
        }
      }
    }
  })

  t.is(files.length, 0)
})

test('outputs files at the correct location', async t => {
  const files = await Maizzle.build('production', {
    build: {
      fail: 'silent',
      templates: {
        source: 'test/stubs/templates',
        destination: {
          path: t.context.folder
        }
      }
    }
  })

  t.true(fs.pathExistsSync(t.context.folder))
  t.is(files.length, 2)
})

test('outputs files at the correct location if multiple template sources are used', async t => {
  const files = await Maizzle.build('local', {
    build: {
      fail: 'silent',
      templates: [
        {
          source: 'test/stubs/templates',
          destination: {
            path: t.context.folder
          }
        },
        {
          source: 'test/stubs/plaintext',
          destination: {
            path: t.context.folder
          }
        }
      ]
    }
  })

  t.true(fs.pathExistsSync(t.context.folder))
  t.is(files.length, 3)
})

test('processes all files in the `filetypes` option', async t => {
  const files = await Maizzle.build('production', {
    build: {
      fail: 'silent',
      templates: {
        source: 'test/stubs/templates',
        filetypes: ['html', 'mzl'],
        destination: {
          path: t.context.folder
        }
      }
    }
  })

  t.true(fs.pathExistsSync(t.context.folder))
  t.is(files.length, 3)
})

test('outputs files with the correct extension', async t => {
  await Maizzle.build('production', {
    build: {
      fail: 'silent',
      templates: {
        source: 'test/stubs/templates',
        destination: {
          path: t.context.folder,
          extension: 'blade.php'
        }
      }
    }
  })

  t.true(fs.readdirSync(t.context.folder).includes('1.blade.php'))
})

test('outputs plaintext files if option is enabled', async t => {
  await Maizzle.build('production', {
    fail: 'silent',
    build: {
      templates: {
        source: 'test/stubs/plaintext',
        destination: {
          path: t.context.folder
        },
        plaintext: true
      }
    }
  })

  const plaintext = fs.readdirSync(t.context.folder).filter(file => file.includes('.txt'))
  const html = fs.readdirSync(t.context.folder).filter(file => file.includes('.html'))
  const plaintextContent = await fs.readFile(`${t.context.folder}/${plaintext[0]}`, 'utf8')
  const htmlContent = await fs.readFile(`${t.context.folder}/${html[0]}`, 'utf8')

  t.is(plaintext.length, 1)
  t.is(plaintextContent, 'Show in HTML\nShow in plaintext')
  t.is(htmlContent, '<div>Show in HTML</div>\n\n')
})

test('copies assets to destination', async t => {
  await Maizzle.build('production', {
    build: {
      fail: 'silent',
      templates: {
        source: 'test/stubs/templates',
        destination: {
          path: t.context.folder
        },
        assets: {
          source: 'test/stubs/assets',
          destination: 'images'
        }
      }
    }
  })

  t.is(fs.pathExistsSync(`${t.context.folder}/images`), true)
  t.is(fs.readdirSync(`${t.context.folder}/images`).length, 1)
})

test('runs the `beforeCreate` event', async t => {
  await Maizzle.build('production', {
    build: {
      fail: 'silent',
      templates: {
        source: 'test/stubs/events',
        destination: {
          path: t.context.folder
        }
      }
    },
    events: {
      beforeCreate(config) {
        config.foo = 'bar'
      }
    }
  })

  const html = fs.readFileSync(`${t.context.folder}/${fs.readdirSync(t.context.folder)[0]}`, 'utf8').trim()

  t.is(html, 'Foo is bar')
})

test('runs the `afterBuild` event', async t => {
  const files = await Maizzle.build('production', {
    build: {
      fail: 'silent',
      templates: {
        source: 'test/stubs/templates',
        destination: {
          path: t.context.folder
        }
      }
    },
    events: {
      afterBuild(files) {
        t.context.afterBuild = files
      }
    }
  })

  const getIntersection = (a, ...array) => [...new Set(a)].filter(v => array.every(b => b.includes(v)))

  t.deepEqual(getIntersection(t.context.afterBuild, files), files)
})

test('supports multiple asset paths', async t => {
  await Maizzle.build('production', {
    build: {
      fail: 'silent',
      templates: {
        source: 'test/stubs/templates',
        destination: {
          path: t.context.folder
        },
        assets: {
          source: ['test/stubs/assets', 'test/stubs/plaintext', 'test/stubs/invalid'],
          destination: 'extras'
        }
      }
    }
  })

  t.true(fs.existsSync(`${t.context.folder}/extras/foo.bar`))
  t.true(fs.existsSync(`${t.context.folder}/extras/plaintext.html`))
  t.false(fs.existsSync(`${t.context.folder}/extras/invalid`))
})

test('warns if a template cannot be rendered and `fail` option is undefined', async t => {
  const files = await Maizzle.build('production', {
    build: {
      templates: {
        source: 'test/stubs/breaking',
        destination: {
          path: t.context.folder
        }
      }
    }
  })

  t.false(files.includes('empty.html'))
})

test('warns if a template cannot be rendered and `fail` option is `verbose`', async t => {
  const files = await Maizzle.build('production', {
    build: {
      fail: 'verbose',
      templates: {
        source: 'test/stubs/breaking',
        destination: {
          path: t.context.folder
        }
      }
    }
  })

  t.false(files.includes('empty.html'))
})

test('warns if a template cannot be rendered and `fail` option is `silent`', async t => {
  const files = await Maizzle.build('production', {
    build: {
      fail: 'silent',
      templates: {
        source: 'test/stubs/breaking',
        destination: {
          path: t.context.folder
        }
      }
    }
  })

  t.false(files.includes('empty.html'))
})

test('spins up local development server', async t => {
  await Maizzle.serve({
    build: {
      templates: {
        source: 'test/stubs/templates',
        destination: {
          path: t.context.folder
        }
      }
    }
  })

  t.true(fs.existsSync(t.context.folder))

  await fs.remove(t.context.folder)
})

test('throws if it cannot spin up local development server', async t => {
  await t.throwsAsync(async () => {
    await Maizzle.serve({})
  }, {instanceOf: TypeError, message: `Cannot read property 'source' of undefined`})
})

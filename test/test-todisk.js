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
    await Maizzle.build('missing')
  }, {instanceOf: Error, message: `could not load config.missing.js`})
})

test('skips if no templates found', async t => {
  const {files} = await Maizzle.build('maizzle-ci', {
    build: {
      fail: 'silent',
      templates: {
        source: 'test/stubs/templates',
        filetypes: 'fake',
        destination: {
          path: t.context.folder
        }
      },
      tailwind: {
        config: {
          purge: false
        }
      }
    }
  })

  t.is(files.length, 0)
})

test('outputs files at the correct location', async t => {
  const {files: string} = await Maizzle.build('maizzle-ci', {
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

  const {files: array} = await Maizzle.build('maizzle-ci', {
    build: {
      fail: 'silent',
      templates: {
        source: ['test/stubs/templates'],
        destination: {
          path: t.context.folder
        }
      }
    }
  })

  t.true(fs.pathExistsSync(t.context.folder))
  t.is(string.length, 3)
  t.is(array.length, 3)
})

test('outputs files at the correct location if multiple template sources are used', async t => {
  const {files} = await Maizzle.build('local', {
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
  t.is(files.length, 4)
})

test('copies all files in the `filetypes` option to destination', async t => {
  const {files} = await Maizzle.build('maizzle-ci', {
    build: {
      fail: 'silent',
      templates: {
        source: 'test/stubs/templates',
        filetypes: ['html', 'mzl'],
        destination: {
          path: t.context.folder
        }
      },
      tailwind: {
        config: {
          purge: false
        }
      }
    }
  })

  t.true(fs.pathExistsSync(t.context.folder))
  t.is(files.length, 4)
})

test('outputs files with the correct extension', async t => {
  await Maizzle.build('maizzle-ci', {
    build: {
      fail: 'silent',
      templates: {
        source: 'test/stubs/templates',
        destination: {
          path: t.context.folder,
          extension: 'blade.php'
        }
      },
      tailwind: {
        config: {
          purge: false
        }
      }
    }
  })

  t.true(fs.readdirSync(t.context.folder).includes('1.blade.php'))
})

test('outputs plaintext files', async t => {
  const {files} = await Maizzle.build('maizzle-ci', {
    fail: 'silent',
    build: {
      templates: {
        source: 'test/stubs/plaintext',
        destination: {
          path: t.context.folder
        },
        plaintext: true
      },
      tailwind: {
        config: {
          purge: false
        }
      }
    }
  })

  const plaintext = files.filter(file => file.includes('.txt'))
  const html = files.filter(file => file.includes('.html'))
  const plaintextContent = await fs.readFile(plaintext[0], 'utf8')
  const htmlContent = await fs.readFile(html[0], 'utf8')

  t.is(plaintext[0], `${t.context.folder}/plaintext.txt`)
  t.is(plaintextContent, 'Show in HTML\nShow in plaintext')
  t.is(htmlContent, '<div>Show in HTML</div>\n\n')
})

test('outputs plaintext files (custom path)', async t => {
  const {files} = await Maizzle.build('maizzle-ci', {
    fail: 'silent',
    build: {
      templates: {
        source: 'test/stubs/plaintext',
        destination: {
          path: t.context.folder
        },
        plaintext: {
          destination: {
            path: `${t.context.folder}/nested/plain.text`
          }
        }
      },
      tailwind: {
        config: {
          purge: false
        }
      }
    }
  })

  const plaintext = files.filter(file => file.includes('.text'))

  t.is(plaintext[0], `${t.context.folder}/nested/plain.text`)
})

test('renders plaintext string', async t => {
  const html = await fs.readFile('test/stubs/plaintext/plaintext.html', 'utf8')
  const {plaintext} = await Maizzle.plaintext(html)

  t.is(plaintext, 'Show in HTML\nShow in plaintext')
})

test('copies assets to destination', async t => {
  await Maizzle.build('maizzle-ci', {
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
      },
      tailwind: {
        config: {
          purge: false
        }
      }
    }
  })

  t.is(fs.pathExistsSync(`${t.context.folder}/images`), true)
  t.is(fs.readdirSync(`${t.context.folder}/images`).length, 1)
})

test('runs the `beforeCreate` event', async t => {
  await Maizzle.build('maizzle-ci', {
    build: {
      fail: 'silent',
      templates: {
        source: 'test/stubs/events',
        destination: {
          path: t.context.folder
        }
      },
      tailwind: {
        config: {
          purge: false
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
  const {files} = await Maizzle.build('maizzle-ci', {
    build: {
      fail: 'silent',
      templates: {
        source: 'test/stubs/templates',
        destination: {
          path: t.context.folder
        }
      },
      tailwind: {
        config: {
          purge: false
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
  await Maizzle.build('maizzle-ci', {
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
      },
      tailwind: {
        config: {
          purge: false
        }
      }
    }
  })

  t.true(fs.existsSync(`${t.context.folder}/extras/foo.bar`))
  t.true(fs.existsSync(`${t.context.folder}/extras/plaintext.html`))
  t.false(fs.existsSync(`${t.context.folder}/extras/invalid`))
})

test('warns if a template cannot be rendered and `fail` option is undefined', async t => {
  const {files} = await Maizzle.build('maizzle-ci', {
    build: {
      templates: {
        source: 'test/stubs/breaking',
        destination: {
          path: t.context.folder
        }
      },
      tailwind: {
        config: {
          purge: false
        }
      }
    }
  })

  t.false(files.includes('empty.html'))
})

test('warns if a template cannot be rendered and `fail` option is `verbose`', async t => {
  const {files} = await Maizzle.build('maizzle-ci', {
    build: {
      fail: 'verbose',
      templates: {
        source: 'test/stubs/breaking',
        destination: {
          path: t.context.folder
        }
      },
      tailwind: {
        config: {
          purge: false
        }
      }
    }
  })

  t.false(files.includes('empty.html'))
})

test('warns if a template cannot be rendered and `fail` option is `silent`', async t => {
  const {files} = await Maizzle.build('maizzle-ci', {
    build: {
      fail: 'silent',
      templates: {
        source: 'test/stubs/breaking',
        destination: {
          path: t.context.folder
        }
      },
      tailwind: {
        config: {
          purge: false
        }
      }
    }
  })

  t.false(files.includes('empty.html'))
})

test('spins up local development server', async t => {
  await Maizzle.serve('local', {
    build: {
      browsersync: {
        ui: false
      },
      templates: {
        source: 'test/stubs/templates',
        destination: {
          path: t.context.folder
        }
      }
    }
  })

  t.true(fs.existsSync(t.context.folder))
})

test('local server does not compile unwanted file types', async t => {
  await Maizzle.serve('local', {
    build: {
      browsersync: {
        ui: false
      },
      templates: {
        source: 'test/stubs/templates',
        destination: {
          path: t.context.folder
        }
      }
    }
  })

  fs.outputFileSync(`test/stubs/templates/1.html`, '<a href="https://example.com">Test</a>\n')
  fs.outputFileSync(`test/stubs/templates/3.mzl`, '<a href="https://example.com">Test</a>\n')

  t.is(fs.readFileSync(`${t.context.folder}/1.html`, 'utf8'), '<a href="https://example.com">Test</a>\n')
  t.is(fs.readFileSync(`${t.context.folder}/3.mzl`, 'utf8'), '<a href="https://example.com">Test</a>\n')

  fs.removeSync(t.context.folder)
})

test('throws if it cannot spin up local development server', async t => {
  await t.throwsAsync(async () => {
    await Maizzle.serve('local', {})
  }, {instanceOf: TypeError})
})

test('works with templates.source defined as function (string paths)', async t => {
  const {files} = await Maizzle.build('maizzle-ci', {
    build: {
      fail: 'silent',
      templates: {
        source: () => 'test/stubs/templates',
        destination: {
          path: t.context.folder
        }
      }
    }
  })

  t.true(fs.pathExistsSync(t.context.folder))
  t.is(files.length, 3)
})

test('works with templates.source defined as function (array paths)', async t => {
  const {files} = await Maizzle.build('maizzle-ci', {
    build: {
      fail: 'silent',
      customSources: ['test/stubs/templates', 'test/stubs/templates'],
      templates: {
        source: config => {
          return config.build.customSources
        },
        destination: {
          path: t.context.folder
        }
      }
    }
  })

  t.true(fs.pathExistsSync(t.context.folder))
  t.is(files.length, 3)
})

test('throws if templates path is invalid', async t => {
  await t.throwsAsync(async () => {
    await Maizzle.build('maizzle-ci', {
      build: {
        fail: 'silent',
        templates: {
          source: false,
          destination: {
            path: t.context.folder
          }
        }
      }
    })
  }, {instanceOf: TypeError})
})

test('throws if templates path is invalid (function)', async t => {
  await t.throwsAsync(async () => {
    await Maizzle.build('maizzle-ci', {
      build: {
        fail: 'silent',
        templates: {
          source: () => {},
          destination: {
            path: t.context.folder
          }
        }
      }
    })
  }, {instanceOf: TypeError})
})

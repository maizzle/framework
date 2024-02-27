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
  }, {instanceOf: Error})
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
      }
    }
  })

  t.is(files.length, 0)
})

test('outputs files at the correct location', async t => {
  const {files: stringSource} = await Maizzle.build('maizzle-ci', {
    build: {
      fail: 'silent',
      templates: {
        source: 'test/stubs/templates',
        filetypes: 'html|test',
        destination: {
          path: t.context.folder
        }
      }
    }
  })

  // `filetypes` will default to `html` if not set
  const {files: arraySource} = await Maizzle.build('maizzle-ci', {
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

  t.true(await fs.pathExists(t.context.folder))
  t.is(stringSource.length, 4)
  t.is(arraySource.length, 4)
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

  t.true(await fs.pathExists(t.context.folder))
  t.is(files.length, 7)
})

test('copies all files in the `filetypes` option to destination', async t => {
  const {files} = await Maizzle.build('maizzle-ci', {
    build: {
      fail: 'silent',
      templates: {
        source: 'test/stubs/templates',
        filetypes: ['html', 'test'],
        destination: {
          path: t.context.folder
        }
      }
    }
  })

  t.true(await fs.pathExists(t.context.folder))
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
      }
    }
  })

  const filelist = await fs.readdir(t.context.folder)

  t.true(filelist.includes('1.blade.php'))
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
      }
    },
    extraAttributes: false
  })

  t.true(files.includes(`${t.context.folder}/plaintext.txt`))

  t.is(
    await fs.readFile(`${t.context.folder}/plaintext.txt`, 'utf8'),
    'Show in HTML\nShow in plaintext'
  )

  t.is(
    await fs.readFile(`${t.context.folder}/plaintext.html`, 'utf8'),
    '<div>Show in HTML</div>\n\n\n  <p>Do not show <a href="url">this</a> in plaintext.</p>\n\n'
  )
})

test('outputs plaintext files (front matter)', async t => {
  const {files} = await Maizzle.build('maizzle-ci', {
    fail: 'silent',
    build: {
      templates: {
        source: 'test/stubs/plaintext',
        destination: {
          path: t.context.folder
        }
      }
    },
    extraAttributes: false
  })

  t.true(files.includes(`${t.context.folder}/front-matter.txt`))

  t.is(
    await fs.readFile(`${t.context.folder}/front-matter.txt`, 'utf8'),
    'Show in HTML\nShow in plaintext'
  )

  t.is(
    await fs.readFile(`${t.context.folder}/front-matter.html`, 'utf8'),
    '<div>Show in HTML</div>\n\n\n  <table><tr><td>Remove from plaintext</td></tr></table>\n\n'
  )
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
      }
    }
  })

  t.true(files.includes(`${t.context.folder}/nested/plain.text`))
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
      }
    }
  })

  const filelist = await fs.readdir(`${t.context.folder}/images`)

  t.is(await fs.pathExists(`${t.context.folder}/images`), true)
  t.is(filelist.length, 1)
})

test('copies assets array to destinations', async t => {
  await Maizzle.build('maizzle-ci', {
    build: {
      fail: 'silent',
      templates: {
        source: 'test/stubs/templates',
        destination: {
          path: t.context.folder
        },
        assets: [
          {
            source: 'test/stubs/assets',
            destination: 'assets/images1'
          },
          {
            source: 'test/stubs/assets2',
            destination: 'assets/images2'
          }
        ]
      }
    }
  })

  const images1 = await fs.readdir(`${t.context.folder}/assets/images1`)
  t.is(await fs.pathExists(`${t.context.folder}/assets/images1`), true)
  t.true(images1.includes('foo.bar'))

  const images2 = await fs.readdir(`${t.context.folder}/assets/images2`)
  t.is(await fs.pathExists(`${t.context.folder}/assets/images2`), true)
  t.true(images2.includes('foo1.bar'))
  t.true(images2.includes('foo2.bar'))
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
      }
    },
    events: {
      beforeCreate(config) {
        config.foo = 'bar'
      }
    }
  })

  const filename = await fs.readdir(t.context.folder)
  const html = await fs.readFile(`${t.context.folder}/${filename[0]}`, 'utf8')

  t.is(html.trim(), '<div class="inline">Foo is bar</div>')
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
  const {files} = await Maizzle.build('maizzle-ci', {
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

  t.true(files.includes(`${t.context.folder}/extras/foo.bar`))
  t.true(files.includes(`${t.context.folder}/extras/plaintext.html`))
  t.false(files.includes(`${t.context.folder}/extras/invalid`))
})

test('supports multiple assets array paths', async t => {
  const {files} = await Maizzle.build('maizzle-ci', {
    build: {
      fail: 'silent',
      templates: {
        source: 'test/stubs/templates',
        destination: {
          path: t.context.folder
        },
        assets: [
          {
            source: ['test/stubs/plaintext', 'test/stubs/invalid'],
            destination: 'extras'
          },
          {
            source: ['test/stubs/assets'],
            destination: 'assets/images1'
          },
          {
            source: ['test/stubs/assets2'],
            destination: 'assets/images2'
          }
        ]
      }
    }
  })

  t.true(files.includes(`${t.context.folder}/extras/plaintext.html`))
  t.false(files.includes(`${t.context.folder}/extras/invalid`))

  t.true(files.includes(`${t.context.folder}/assets/images1/foo.bar`))

  t.true(files.includes(`${t.context.folder}/assets/images2/foo1.bar`))
  t.true(files.includes(`${t.context.folder}/assets/images2/foo2.bar`))
})

test('supports multiple assets array paths with templates array', async t => {
  const {files} = await Maizzle.build('maizzle-ci', {
    build: {
      fail: 'silent',
      templates: [
        {
          source: 'test/stubs/plaintext',
          destination: {
            path: t.context.folder
          },
          assets: [
            {
              source: ['test/stubs/invalid', 'test/stubs/assets'],
              destination: 'assets/extras1'
            },
            {
              source: ['test/stubs/assets2'],
              destination: 'assets/extras2'
            }
          ]
        },
        {
          source: 'test/stubs/templates',
          destination: {
            path: t.context.folder
          },
          assets: [
            {
              source: ['test/stubs/invalid', 'test/stubs/assets'],
              destination: 'assets/extras3'
            },
            {
              source: ['test/stubs/assets2'],
              destination: 'assets/extras4'
            }
          ]
        }
      ]
    }
  })

  t.false(files.includes(`${t.context.folder}/assets/extras1/invalid`))
  t.true(files.includes(`${t.context.folder}/assets/extras1/foo.bar`))

  t.true(files.includes(`${t.context.folder}/assets/extras2/foo1.bar`))
  t.true(files.includes(`${t.context.folder}/assets/extras2/foo2.bar`))

  t.false(files.includes(`${t.context.folder}/assets/extras3/invalid`))
  t.true(files.includes(`${t.context.folder}/assets/extras3/foo.bar`))

  t.true(files.includes(`${t.context.folder}/assets/extras4/foo1.bar`))
  t.true(files.includes(`${t.context.folder}/assets/extras4/foo2.bar`))
})

test('warns if a template cannot be rendered and `fail` option is undefined', async t => {
  const {files} = await Maizzle.build('maizzle-ci', {
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
  const {files} = await Maizzle.build('maizzle-ci', {
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
  const {files} = await Maizzle.build('maizzle-ci', {
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

test('throws if `templates.source` is undefined', async t => {
  await t.throwsAsync(async () => {
    await Maizzle.build('maizzle-ci')
  }, {instanceOf: Error})
})

test('`templates.source` defined as function (string paths)', async t => {
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

  t.is(files.length, 4)
})

test('`templates.source` defined as function (array paths)', async t => {
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

  t.is(files.length, 4)
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

test('sets config.build.current.path', async t => {
  await Maizzle.build('maizzle-ci', {
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
      beforeRender(html, config) {
        t.context.current = config.build.current

        return html
      }
    }
  })

  t.deepEqual(t.context.current, {
    path: {
      root: '',
      dir: `${t.context.folder}/nested`,
      base: '3.html',
      ext: '.html',
      name: '3'
    }
  })
})

test('skips compiling templates', async t => {
  let parsedFilesFromStringSource = 0
  await Maizzle.build('maizzle-ci', {
    build: {
      fail: 'silent',
      templates: {
        source: 'test/stubs/templates',
        skip: '1.html',
        destination: {
          path: t.context.folder
        }
      }
    },
    // Increment counter for each file that was actually parsed
    events: {
      afterRender(html) {
        parsedFilesFromStringSource++

        return html
      }
    }
  })

  let parsedFilesFromArraySource = 0
  await Maizzle.build('maizzle-ci', {
    build: {
      fail: 'silent',
      templates: {
        source: ['test/stubs/templates'],
        skip: ['1.html', 'nested/3.html'],
        destination: {
          path: t.context.folder
        }
      }
    },
    events: {
      afterRender(html) {
        parsedFilesFromArraySource++

        return html
      }
    }
  })

  t.is(parsedFilesFromStringSource, 2)
  t.is(parsedFilesFromArraySource, 1)
})

test('does not output omitted files', async t => {
  const {files: fromStringSource} = await Maizzle.build('maizzle-ci', {
    build: {
      fail: 'silent',
      templates: {
        source: 'test/stubs/templates',
        omit: '1.html',
        destination: {
          path: t.context.folder
        }
      }
    }
  })

  const {files: fromArraySource} = await Maizzle.build('maizzle-ci', {
    build: {
      fail: 'silent',
      templates: {
        source: ['test/stubs/templates'],
        omit: ['1.html', 'nested/3.html'],
        destination: {
          path: t.context.folder
        }
      }
    }
  })

  t.is(fromStringSource.length, 3)
  t.is(fromArraySource.length, 2)
})

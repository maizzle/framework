const test = require('ava')
const Tailwind = require('../src/generators/tailwind')

test('throws if CSS provided to fromString is not a CSS string', async t => {
  await t.throwsAsync(async () => {
    await Tailwind.fromString(null, '<div class="text-center">Test</a>', {}, {})
  }, {instanceOf: Error, message: 'PostCSS received null instead of CSS string'})
})

test('uses default Tailwind if no config specified', async t => {
  const config = {
    purgeCSS: {
      content: [{raw: '<div class="xl:z-0"></div>'}]
    }
  }
  const css = await Tailwind.fromFile(config)
  t.not(css, undefined)
  t.is(css, '@media (min-width: 1280px) { .xl\\:z-0 {\n    z-index: 0\n  }\n}')
})

test('uses purgeCSS options provided in the config', async t => {
  const config = {
    purgeCSS: {
      content: [{raw: '<div class="z-0"></div>'}],
      whitelist: ['z-10']
    }
  }
  const css = await Tailwind.fromFile(config, 'production')
  t.is(css, '.z-0 {\n  z-index: 0\n} .z-10 {\n  z-index: 10\n}')
})

test('uses postcss plugins from the config when compiling from string', async t => {
  const maizzleConfig = {
    build: {
      postcss: {
        plugins: [
          require('autoprefixer')({overrideBrowserslist: ['> 0.1%']})
        ]
      }
    }
  }
  const css = await Tailwind.fromString('.test {transform: scale(0.5)}', '<div class="test">Test</a>', {}, maizzleConfig)
  t.not(css, undefined)
  t.is(css, '.test {\n  -webkit-transform: scale(0.5);\n      -ms-transform: scale(0.5);\n          transform: scale(0.5)\n}')
})

test('uses postcss plugins from the config when compiling from file', async t => {
  const config = {
    build: {
      tailwind: {
        config: {
          target: 'ie11'
        }
      },
      postcss: {
        plugins: [
          require('autoprefixer')({overrideBrowserslist: ['> 0.1%']})
        ]
      }
    },
    purgeCSS: {
      content: [{raw: '<div class="object-fill"></div>'}]
    }
  }
  const css = await Tailwind.fromFile(config)

  t.not(css, undefined)
  t.is(css, '.object-fill {\n  -o-object-fit: fill;\n     object-fit: fill\n}')
})

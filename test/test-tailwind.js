const test = require('ava')
const Tailwind = require('../src/generators/tailwind')

test('uses Tailwind defaults if no config specified', async t => {
  const config = {
    env: 'node',
    purgeCSS: {
      content: [{raw: '<div class="xl:z-0"></div>'}]
    }
  }

  const css = await Tailwind.compile('', '', {}, config)

  t.not(css, undefined)
  t.is(css, '@media (min-width: 1280px) {\n\n  .xl\\:z-0 {\n    z-index: 0\n  }\n}')
})

test('uses purgeCSS options provided in the config', async t => {
  const config = {
    purgeCSS: {
      content: [{raw: '<div class="z-0"></div>'}],
      whitelist: ['z-10']
    }
  }

  const css = await Tailwind.compile('', '', {}, config)

  t.is(css, '.z-0 {\n  z-index: 0\n}\n\n.z-10 {\n  z-index: 10\n}')
})

test('uses postcss plugins from the config when compiling from string', async t => {
  const maizzleConfig = {
    env: 'node',
    build: {
      postcss: {
        plugins: [
          require('autoprefixer')({overrideBrowserslist: ['> 0.1%']})
        ]
      }
    }
  }

  const css = await Tailwind.compile('.test {transform: scale(0.5)}', '<div class="test">Test</a>', {}, maizzleConfig)

  t.not(css, undefined)
  t.is(css, '.test {\n  -webkit-transform: scale(0.5);\n      -ms-transform: scale(0.5);\n          transform: scale(0.5)\n}')
})

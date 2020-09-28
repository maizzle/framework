const test = require('ava')
const fs = require('fs-extra')
const Tailwind = require('../src/generators/tailwind')

test('uses Tailwind defaults if no config specified', async t => {
  const config = {
    env: 'node',
    purgeCSS: {
      content: [{raw: '<div class="xl:z-0"></div>'}]
    }
  }

  const css = await Tailwind.compile('', '', {}, config)
  const expected = await fs.readFile('./test/expected/tailwind/default.css', 'utf8')

  t.not(css, undefined)
  t.is(css.trim(), expected.trim())
})

test('uses CSS file provided in environment config', async t => {
  const config = {
    env: 'node',
    build: {
      tailwind: {
        css: './test/stubs/main.css'
      }
    }
  }

  const css = await Tailwind.compile('', '<div class="text-center foo">test</div>', {corePlugins: {animation: false}}, config)

  t.not(css, undefined)
  t.is(css.trim(), '.text-center {\n  text-align: center !important;\n}\n\n.foo {\n  color: red;\n}')
})

test('uses purgeCSS options provided in the config', async t => {
  const config = {
    purgeCSS: {
      content: [{raw: '<div class="z-0 text-center"></div>'}],
      safelist: ['z-10'],
      blocklist: ['text-center']
    }
  }

  const css = await Tailwind.compile('', '', {corePlugins: {animation: false}}, config)

  t.is(css.trim(), '.z-0 {\n  z-index: 0 !important\n}\n\n.z-10 {\n  z-index: 10 !important\n}')
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

  const css = await Tailwind.compile('.test {transform: scale(0.5)}', '<div class="test">Test</a>', {corePlugins: {animation: false}}, maizzleConfig)

  t.not(css, undefined)
  t.is(css.trim(), '.test {\n  -webkit-transform: scale(0.5);\n      -ms-transform: scale(0.5);\n          transform: scale(0.5)\n}')
})

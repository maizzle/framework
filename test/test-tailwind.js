const test = require('ava')
const fs = require('fs-extra')
const Tailwind = require('../src/generators/tailwindcss')

test('uses Tailwind defaults if no config specified', async t => {
  const config = {
    env: 'node',
    purgeCSS: {
      content: [{raw: '<div class="xl:z-0"></div>'}]
    }
  }

  const css = await Tailwind.compile('@tailwind utilities', '', {}, config)
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

  const css = await Tailwind.compile('', '<div class="text-center foo">test</div>', {}, config)

  t.not(css, undefined)
  t.is(css.trim(), '.text-center {\n  text-align: center !important;\n}\n\n.foo {\n  color: red;\n}')
})

test('uses purgeCSS options provided in the config', async t => {
  const html = '<div class="z-0 text-center"></div>'

  const arrayConfig = {
    purgeCSS: {
      content: [{raw: html}],
      safelist: ['z-10'],
      blocklist: ['text-center']
    }
  }

  const objectConfig = {
    purgeCSS: {
      content: [{raw: html}],
      safelist: {
        standard: ['z-10']
      },
      blocklist: ['text-center']
    }
  }

  const css1 = await Tailwind.compile('@tailwind utilities', '', {}, arrayConfig)
  const css2 = await Tailwind.compile('@tailwind utilities', '', {}, objectConfig)

  t.is(css1.trim(), '.z-0 {\n  z-index: 0 !important\n}\n\n.z-10 {\n  z-index: 10 !important\n}')
  t.is(css2.trim(), '.z-0 {\n  z-index: 0 !important\n}\n\n.z-10 {\n  z-index: 10 !important\n}')
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
  t.is(css.trim(), '.test {\n  -webkit-transform: scale(0.5);\n      -ms-transform: scale(0.5);\n          transform: scale(0.5)\n}')
})

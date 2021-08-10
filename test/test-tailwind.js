const test = require('ava')
const Tailwind = require('../src/generators/tailwindcss')

test('uses Tailwind defaults if no config specified', async t => {
  const css = await Tailwind.compile('@tailwind utilities', '<p class="xl:z-0"></p>', {}, {env: 'production'})

  t.not(css, undefined)
  t.true(css.includes('.xl\\:z-0'))
})

test('uses CSS file provided in environment config', async t => {
  const config = {
    env: 'production',
    build: {
      tailwind: {
        css: './test/stubs/main.css'
      }
    }
  }

  const css = await Tailwind.compile('', '<div class="text-center foo">test</div>', {}, config)

  t.not(css, undefined)
  t.true(css.includes('.text-center'))
  t.true(css.includes('.foo'))
})

test('uses purgeCSS options provided in the maizzle config', async t => {
  const arrayConfig = {
    purgeCSS: {
      safelist: ['z-10'],
      blocklist: ['text-center']
    }
  }

  const objectConfig = {
    purgeCSS: {
      safelist: {
        standard: ['z-10']
      },
      blocklist: ['text-center']
    }
  }

  const css1 = await Tailwind.compile('@tailwind utilities', '<div class="z-0 text-center"></div>', {}, arrayConfig)
  const css2 = await Tailwind.compile('@tailwind utilities', '<div class="z-0 text-center"></div>', {}, objectConfig)

  t.true(css1.includes('.z-0'))
  t.true(css1.includes('.z-10'))
  t.false(css1.includes('.text-center'))

  t.true(css2.includes('.z-0'))
  t.true(css2.includes('.z-10'))
  t.false(css2.includes('.text-center'))
})

test('uses postcss plugins from the maizzle config when compiling from string', async t => {
  const maizzleConfig = {
    env: 'production',
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
  t.is(css.trim(), '/* purgecss start ignore */\n\n.test {\n  -webkit-transform: scale(0.5);\n      -ms-transform: scale(0.5);\n          transform: scale(0.5)\n}\n\n/* purgecss end ignore */')
})

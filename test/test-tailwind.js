const test = require('ava')
const Tailwind = require('../src/generators/tailwindcss')

test('uses Tailwind defaults if no config specified', async t => {
  const css = await Tailwind.compile(
    '@tailwind utilities;',
    '<p class="xl:z-0"></p>',
    {},
    {env: 'production'}
  )

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

test('works with custom `content` sources', async t => {
  const css = await Tailwind.compile(
    '@tailwind utilities;',
    '<div class="hidden"></div>',
    {
      content: ['./test/stubs/tailwind/*.*']
    }
  )

  t.true(css.includes('.hidden'))
})

test('works with custom `files` sources', async t => {
  const css = await Tailwind.compile(
    '@tailwind utilities;',
    '<div></div>',
    {
      content: {
        files: ['./test/stubs/tailwind/*.*']
      }
    }
  )

  t.true(css.includes('.hidden'))
})

test('uses maizzle template paths when purging', async t => {
  const css = await Tailwind.compile(
    '@tailwind utilities;',
    '<div></div>',
    {},
    {
      build: {
        templates: {
          source: './test/stubs/tailwind'
        }
      }
    }
  )

  t.true(css.includes('.hidden'))
})

test('uses custom postcss plugins from the maizzle config', async t => {
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
  t.is(css.trim(), '.test {-webkit-transform: scale(0.5);transform: scale(0.5)}')
})

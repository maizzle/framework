const test = require('ava')
const Tailwind = require('../src/generators/tailwindcss')

test('throws on compile error', async t => {
  await t.throwsAsync(async () => {
    await Tailwind.compile({
      css: 'div {@apply inexistent;}',
      html: '<div class="inline">Test</a>'
    })
  }, {instanceOf: SyntaxError})
})

test('uses defaults if no config specified', async t => {
  const css = await Tailwind.compile({
    css: '@tailwind utilities;',
    html: '<p class="xl:w-1"></p>'
  })

  t.not(css, undefined)
  t.true(css.includes('@media (min-width: 1280px)'))
})

test('uses css file provided in environment config', async t => {
  const config = {
    build: {
      tailwind: {
        css: './test/stubs/main.css'
      }
    }
  }

  const css = await Tailwind.compile({
    html: '<div class="text-center foo">test</div>',
    config
  })

  t.not(css, undefined)
  t.true(css.includes('.text-center'))
  t.true(css.includes('.foo'))
})

test('works with custom `content` sources', async t => {
  const css = await Tailwind.compile({
    config: {
      build: {
        tailwind: {
          config: {
            content: ['./test/stubs/tailwind/*.html']
          }
        }
      }
    }
  })

  t.true(css.includes('.hidden'))
})

test('works with custom `files` sources', async t => {
  const css = await Tailwind.compile({
    config: {
      build: {
        tailwind: {
          config: {
            content: {
              files: ['./test/stubs/tailwind/*.html']
            }
          }
        }
      }
    }
  })

  t.true(css.includes('.hidden'))
})

test('uses maizzle template path as content source', async t => {
  const css = await Tailwind.compile({
    config: {
      build: {
        templates: {
          source: './test/stubs/tailwind'
        }
      }
    }
  })

  t.true(css.includes('.hidden'))
})

test('uses maizzle template path as content source (single file)', async t => {
  const css = await Tailwind.compile({
    config: {
      build: {
        templates: {
          source: './test/stubs/tailwind/content-source.html'
        }
      }
    }
  })

  t.true(css.includes('.hidden'))
})

test('uses custom postcss plugins from the maizzle config', async t => {
  const config = {
    build: {
      postcss: {
        plugins: [
          require('autoprefixer')({overrideBrowserslist: ['> 0.1%']})
        ]
      }
    }
  }

  const css = await Tailwind.compile({
    css: '.test {transform: scale(0.5)}',
    html: '<div class="test inline">Test</div>',
    config
  })

  t.not(css, undefined)
  t.is(css.trim(), '.inline {display: inline !important} .test {-webkit-transform: scale(0.5);transform: scale(0.5)}')
})

test('respects `shorthandCSS` in maizzle config', async t => {
  const shorthandDisabled = await Tailwind.compile({
    css: '@layer utilities { .padded {@apply px-4 py-6;} }',
    html: '<div class="padded">Test</div>'
  })

  const shorthandEnabled = await Tailwind.compile({
    css: '@layer utilities { .padded {@apply px-4 py-6;} }',
    html: '<div class="padded">Test</div>',
    config: {
      shorthandCSS: true
    }
  })

  t.is(
    shorthandDisabled.replace(/\s+/g, '').trim(),
    '.padded{padding-left:1rem;padding-right:1rem;padding-top:1.5rem;padding-bottom:1.5rem}'
  )

  t.is(
    shorthandEnabled.replace(/\s+/g, '').trim(),
    '.padded{padding:1.5rem1rem}'
  )
})

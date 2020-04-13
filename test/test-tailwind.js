const test = require('ava')
const Tailwind = require('../src/generators/tailwind')

test('It throws if CSS provided to fromString is not a CSS string', async t => {
  await t.throwsAsync(async () => {
    await Tailwind.fromString(null, '<div class="text-center">Test</a>', {}, {})
  }, {instanceOf: Error, message: 'PostCSS received null instead of CSS string'})
})

test('It uses default Tailwind if no config specified', async t => {
  const config = {
    purgeCSS: {
      content: [{raw: '<div class="xl:z-0"></div>'}]
    }
  }
  const css = await Tailwind.fromFile(config)
  t.not(css, undefined)
  t.is(css, '@media (min-width: 1280px) { .xl\\:z-0 {\n    z-index: 0\n  }\n}')
})

test('It uses purgeCSS options provided in the config', async t => {
  const config = {
    build: {
      tailwind: {
        config: {
          theme: {
            screens: {},
            maxWidth: {
              '@2x': '200%'
            }
          }
        }
      }
    },
    purgeCSS: {
      content: [{raw: '<div class="max-w-@2x text-black"></div>'}],
      extractor: /[\w-/:%.@]+(?<!:)/g,
      whitelist: ['z-10'],
      whitelistPatterns: [/z-0/]
    }
  }
  const css = await Tailwind.fromFile(config, 'production')
  t.is(css, '.max-w-\\@2x {\n  max-width: 200%\n} .text-black {\n  color: #000\n} .z-0 {\n  z-index: 0\n} .z-10 {\n  z-index: 10\n}')
})

const test = require('ava')
const Maizzle = require('../src')
const removePlaintextTags = require('../src/transformers/plaintext')

const {join} = require('path')
const {readFileSync} = require('fs')

const fixture = file => readFileSync(join(__dirname, 'fixtures', `${file}.html`), 'utf8')
const expected = file => readFileSync(join(__dirname, 'expected', `${file}.html`), 'utf8')

const clean = html => html.replace(/[^\S\r\n]+$/gm, '').trim()

const maizzleConfig = options => {
  return {
    maizzle: {
      config: {
        env: 'node',
        ...options
      }
    }
  }
}

const processFile = (t, name, options = {}, log = false) => {
  return Maizzle.render(fixture(name), {...options})
    .then(result => log ? console.log(result) : clean(result))
    .then(html => t.is(html, expected(name).trim()))
}

test('removes inline sizes', t => {
  return processFile(t, 'remove-inline-sizes', maizzleConfig({
    inlineCSS: {
      enabled: true,
      keepOnlyAttributeSizes: {
        width: ['TABLE'],
        height: ['TD']
      }
    }
  }))
})

test('removes inline background-color', t => {
  return processFile(t, 'remove-inline-bgcolor', maizzleConfig({
    inlineCSS: {
      enabled: true,
      preferBgColorAttribute: true
    }
  }))
})

test('removes inline background-color (with tags)', t => {
  return processFile(t, 'remove-inline-bgcolor-tags', maizzleConfig({
    inlineCSS: {
      enabled: true,
      preferBgColorAttribute: {
        enabled: true,
        tags: ['td']
      }
    }
  }))
})

test('inline CSS', t => {
  return processFile(t, 'inline', maizzleConfig({
    inlineCSS: {
      enabled: true,
      removeStyleTags: false,
      styleToAttribute: {
        'text-align': 'align'
      },
      applySizeAttribute: {
        width: ['TABLE'],
        height: ['TD']
      },
      excludedProperties: ['cursor'],
      codeBlocks: {
        ASP: {
          start: '<%',
          end: '%>'
        }
      }
    }
  }))
})

test('removes attributes', t => {
  return processFile(t, 'remove-attributes', maizzleConfig({
    removeAttributes: [
      {name: 'role', value: 'article'},
      {name: 'contenteditable'}
    ]
  }))
})

test('extra attributes', t => {
  return processFile(t, 'extra-attributes', maizzleConfig({
    extraAttributes: {
      div: {
        role: 'article',
        class: 'text-center'
      }
    }
  }))
})
test('base image URL', t => {
  return processFile(t, 'base-image-url', maizzleConfig({
    baseImageURL: 'https://example.com/'
  }))
})

test('prettify', t => {
  return processFile(t, 'prettify', maizzleConfig({
    prettify: {
      enabled: true,
      indent_inner_html: true, // eslint-disable-line
      ocd: true
    }
  }))
})

test('minify', t => {
  return processFile(t, 'minify', maizzleConfig({
    minify: {
      enabled: true,
      lineLengthLimit: 500,
      removeIndentations: true,
      removeLineBreaks: true,
      breakToTheLeftOf: ['<table']
    }
  }))
})

test('removes plaintext tag', t => {
  const html = removePlaintextTags(fixture('plaintext'), {})

  t.is(html, expected('plaintext'))
})

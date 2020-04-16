const test = require('ava')
const Maizzle = require('../src')
const removePlaintextTags = require('../src/transformers/plaintext')

const {join} = require('path')
const {readFileSync} = require('fs')

const fixture = file => readFileSync(join(__dirname, 'fixtures', `${file}.html`), 'utf8')
const expected = file => readFileSync(join(__dirname, 'expected', `${file}.html`), 'utf8')

const clean = html => html.replace(/[^\S\n]+$/gm, '').trim()

const maizzleConfig = (options = {}) => {
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

test('remove inline sizes', t => {
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

test('remove inline background-color', t => {
  return processFile(t, 'remove-inline-bgcolor', maizzleConfig({
    inlineCSS: {
      enabled: true,
      preferBgColorAttribute: true
    }
  }))
})

test('remove inline background-color (with tags)', t => {
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

test('remove unused CSS', t => {
  return processFile(t, 'email-comb', maizzleConfig({
    removeUnusedCSS: {
      enabled: true,
      removeHTMLComments: false,
      removeCSSComments: false,
      whitelist: ['.preserve*']
    }
  }))
})

test('remove attributes', t => {
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
      indent_inner_html: true // eslint-disable-line
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
  let html = removePlaintextTags(fixture('plaintext'), {})
  html = html.replace(/[^\S\r\n]+$/gm, '').trim()

  t.is(html, expected('plaintext').trim())
})

test('replace strings', t => {
  return processFile(t, 'replace-strings', maizzleConfig({
    replaceStrings: {
      test: 'replace strings test',
      '{head}': '<%=',
      '{tail}': '%>'
    }
  }))
})

test('six digit hex', t => {
  return processFile(t, 'six-hex', maizzleConfig())
})

test('transform contents', t => {
  return processFile(t, 'transform-contents', maizzleConfig({
    transformContents: {
      foo: text => text.replace(/foo/g, 'Foo is the way'),
      bar: text => text.replace(/bar/g, 'Bar all day')
    }
  }))
})

test('url parameters', t => {
  return processFile(t, 'url-params', maizzleConfig({
    urlParameters: {
      source: 'email',
      campaign: '@CampaignName@'
    }
  }))
})

const {get} = require('lodash')
const postcss = require('postcss')
const postcssImport = require('postcss-import')
const postcssNested = require('tailwindcss/nesting')
const mergeLonghand = require('postcss-merge-longhand')

module.exports = {
  process: async (css = '', maizzleConfig = {}) => {
    return postcss([
      postcssImport(),
      postcssNested(),
      get(maizzleConfig, 'shorthandCSS', get(maizzleConfig, 'shorthandInlineCSS')) === true ?
        mergeLonghand() :
        () => {},
      ...get(maizzleConfig, 'build.postcss.plugins', [])
    ])
      .process(css, {from: undefined})
      .then(result => result.css)
      .catch(error => {
        throw new SyntaxError(error)
      })
  }
}

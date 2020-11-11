const {get} = require('lodash')
const {crush} = require('html-crush')

module.exports = async (html, config = {}, direct = false) => {
  const shouldMinify = direct ? true : get(config, 'minify.enabled', false)

  config = direct ? {
    lineLengthLimit: 500,
    removeIndentations: true,
    removeLineBreaks: true,
    ...config
  } : get(config, 'minify', {})

  if (shouldMinify) {
    html = crush(html, {removeLineBreaks: true, ...config}).result
  }

  return html
}

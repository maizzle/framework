const {get} = require('lodash')
const {crush} = require('html-crush')

module.exports = async (html, config) => {
  if (get(config, 'minify.enabled', false)) {
    html = crush(html, {removeLineBreaks: true, ...config.minify}).result
  }

  return html
}

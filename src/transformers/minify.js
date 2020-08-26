const {crush} = require('html-crush')
const {isObject} = require('../utils/helpers')

module.exports = async (html, config) => {
  if (isObject(config.minify) && config.minify.enabled) {
    html = crush(html, config.minify).result
  }

  return html
}

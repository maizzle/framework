const { crush } = require('html-crush')

module.exports = async (html, config) => {
  if (config.minify && config.minify.enabled) {
    html = crush(html, config.minify).result
  }

  return html
}

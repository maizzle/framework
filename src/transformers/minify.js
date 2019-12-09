const { minify } = require('html-minifier')

module.exports = async (html, config) => {
  if (config.minify && config.minify.enabled) {
    return minify(html, config.minify)
  }

  return html
}

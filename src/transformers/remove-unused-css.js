const {comb} = require('email-comb')

module.exports = async (html, config) => {
  const options = config.removeUnusedCSS || {}

  if (options.enabled) {
    return comb(html, options).result
  }

  return html
}

const { comb } = require('email-comb')

module.exports = async (html, config) => {
  const opts = config.removeUnusedCSS || {}

  if (opts.enabled) {
    return comb(html, opts).result
  }

  return html
}

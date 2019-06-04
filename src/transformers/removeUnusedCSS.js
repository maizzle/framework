const { comb } = require('email-comb')

module.exports = async (html, config) => {

  let opts = config.cleanup.removeUnusedCSS

  if (config.cleanup && opts && opts.enabled) {
    return comb(html, opts).result
  }

  return html
}

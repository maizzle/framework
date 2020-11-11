const {comb} = require('email-comb')

module.exports = async (html, config = {}, direct = false) => {
  const options = direct ? config : config.removeUnusedCSS || {}

  if (options.enabled || direct) {
    return comb(html, options).result
  }

  return html
}

const {get} = require('lodash')
const {comb} = require('email-comb')

module.exports = async (html, config = {}, direct = false) => {
  if (!get(config, 'removeUnusedCSS', {})) {
    return html
  }

  const options = direct ? config : get(config, 'removeUnusedCSS', {})

  return comb(html, options).result
}

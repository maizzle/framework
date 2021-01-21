const {get, isEmpty} = require('lodash')
const {comb} = require('email-comb')

module.exports = async (html, config = {}, direct = false) => {
  if (get(config, 'removeUnusedCSS') === false) {
    return html
  }

  const options = direct ? config : get(config, 'removeUnusedCSS', {})

  if (typeof options === 'boolean' && options) {
    return comb(html).result
  }

  if (!isEmpty(options)) {
    return comb(html, options).result
  }

  return html
}

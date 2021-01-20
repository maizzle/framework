const {get, isEmpty} = require('lodash')
const {comb} = require('email-comb')

module.exports = async (html, config = {}, direct = false) => {
  const options = direct ? config : get(config, 'removeUnusedCSS', {})

  if (isEmpty(options)) {
    return html
  }

  return comb(html, options).result
}

const {get, isEmpty} = require('lodash')
const pretty = require('pretty')

module.exports = async (html, config = {}, direct = false) => {
  if (get(config, 'prettify') === false) {
    return html
  }

  config = direct ? config : get(config, 'prettify', {})

  if (typeof config === 'boolean' && config) {
    return pretty(html)
  }

  if (!isEmpty(config)) {
    return pretty(html, config)
  }

  return html
}

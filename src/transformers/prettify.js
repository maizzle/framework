const {get} = require('lodash')
const pretty = require('pretty')

module.exports = async (html, config = {}, direct = false) => {
  const shouldPrettify = direct ? true : get(config, 'prettify.enabled', false)
  config = direct ? config : get(config, 'prettify', {})

  if (shouldPrettify) {
    return pretty(html, config)
  }

  return html
}

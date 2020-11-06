const {isObject, isEmpty} = require('lodash')

module.exports = async (html, config) => {
  if (isObject(config.replaceStrings) && !isEmpty(config.replaceStrings)) {
    Object.entries(config.replaceStrings).forEach(([k, v]) => {
      const regex = new RegExp(k, 'gi')
      html = html.replace(regex, v)
    })
  }

  return html
}

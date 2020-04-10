
const { isObject, isEmptyObject } = require('../utils/helpers')

module.exports = async (html, config) => {
  if (isObject(config.replaceStrings) && !isEmptyObject(config.replaceStrings)) {
    Object.entries(config.replaceStrings).map(([k, v]) => {
      const regex = new RegExp(k, 'gi')
      html = html.replace(regex, v)
    })
  }

  return html
}

const {isEmpty, get} = require('lodash')

module.exports = async (html, config = {}, direct = false) => {
  const replacements = direct ? config : get(config, 'replaceStrings', {})

  if (!isEmpty(replacements)) {
    Object.entries(replacements).forEach(([k, v]) => {
      const regex = new RegExp(k, 'gi')
      html = html.replace(regex, v)
    })
  }

  return html
}

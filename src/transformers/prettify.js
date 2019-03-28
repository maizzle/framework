const pretty = require('pretty')

module.exports = async (html, config) => {

  if (config.prettify && config.prettify.enabled) {
    return pretty(html, config.prettify)
  }

  return html
}

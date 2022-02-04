const {get} = require('lodash')
const {conv} = require('color-shorthand-hex-to-six-digit')

module.exports = async (html, config = {}) => {
  if (get(config, 'sixHex') === false) {
    return html
  }

  return conv(html)
}

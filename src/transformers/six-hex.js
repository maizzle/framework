const {get} = require('lodash')
const sixHex = require('color-shorthand-hex-to-six-digit')

module.exports = async (html, config = {}) => {
  if (get(config, 'sixHex') === false) {
    return html
  }

  return sixHex(html)
}

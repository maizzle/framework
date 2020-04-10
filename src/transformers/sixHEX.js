const sixHex = require('color-shorthand-hex-to-six-digit')

module.exports = async (html, config) => {
  if (config.env !== 'local') {
    return sixHex(html)
  }

  return html
}

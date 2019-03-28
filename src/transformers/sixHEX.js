const sixHex = require('color-shorthand-hex-to-six-digit')

module.exports = async (html, env) => {

  if (env !== 'local') {
    return sixHex(html)
  }

  return html
}

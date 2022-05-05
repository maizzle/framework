const {crush} = require('html-crush')
const {get, isEmpty} = require('lodash')

module.exports = async (html, config = {}, direct = false) => {
  if (get(config, 'minify') === false) {
    return html
  }

  config = direct ? {
    lineLengthLimit: 500,
    removeIndentations: true,
    removeLineBreaks: true,
    ...config
  } : get(config, 'minify', {})

  if (!isEmpty(config)) {
    html = crush(html, {removeLineBreaks: true, ...config}).result
  }

  return html
}

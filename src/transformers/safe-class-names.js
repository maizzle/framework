const posthtml = require('posthtml')
const {getPropValue} = require('../utils/helpers')
const safeClassNames = require('posthtml-safe-class-names')

module.exports = async (html, config) => {
  if (typeof config.safeClassNames === 'boolean' && !config.safeClassNames) {
    return html
  }

  if (typeof config.env === 'string' && config.env !== 'local') {
    const replacements = config.safeClassNames || {}
    const options = getPropValue(config, 'build.posthtml.options') || {}

    html = posthtml([safeClassNames({replacements})]).process(html, options).then(result => result.html)
  }

  return html
}

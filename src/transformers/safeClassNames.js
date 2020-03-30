const posthtml = require('posthtml')
const safeClassNames = require('posthtml-safe-class-names')

module.exports = async (html, config, options = config.build.posthtml.options || {}) => {
  if (config.env !== 'local') {
    const replacements = config.safeClassNames || {}
    html = posthtml([safeClassNames({ replacements: replacements })]).process(html, options).then(result => result.html)
  }

  return html
}

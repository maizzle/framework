const {get} = require('lodash')
const posthtml = require('posthtml')
const safeClassNames = require('posthtml-safe-class-names')

module.exports = async (html, config) => {
  if (typeof config.safeClassNames === 'boolean' && !config.safeClassNames) {
    return html
  }

  if (typeof config.env === 'string' && config.env !== 'local') {
    const replacements = get(config, 'safeClassNames', {})
    const posthtmlOptions = get(config, 'build.posthtml.options', {})

    html = posthtml([safeClassNames({replacements})]).process(html, posthtmlOptions).then(result => result.html)
  }

  return html
}

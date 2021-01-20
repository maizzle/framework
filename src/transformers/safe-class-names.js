const {get} = require('lodash')
const posthtml = require('posthtml')
const safeClassNames = require('posthtml-safe-class-names')

module.exports = async (html, config = {}, direct = false) => {
  if (get(config, 'safeClassNames') === false) {
    return html
  }

  if (config.env === 'local') {
    return html
  }

  const posthtmlOptions = get(config, 'build.posthtml.options', {})
  const replacements = direct ? config : get(config, 'safeClassNames', {})

  return posthtml([safeClassNames({replacements})]).process(html, posthtmlOptions).then(result => result.html)
}

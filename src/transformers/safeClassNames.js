const posthtml = require('posthtml')
const {get, isEmpty} = require('lodash')
const {merge} = require('../utils/helpers')
const safeClassNames = require('posthtml-safe-class-names')
const defaultConfig = require('../generators/posthtml/defaultConfig')

module.exports = async (html, config = {}, direct = false) => {
  /*
   * Don't run when:
   * - `config` is falsy or empty
   * - developing locally and `safeClassNames` is not explicitly `true`
   * - `safeClassNames` is explicitly `false`
   */
  if (
    !config
    || isEmpty(config)
    || (get(config, 'env') === 'local' && get(config, 'safeClassNames') !== true)
    || get(config, 'safeClassNames') === false
  ) {
    return html
  }

  const posthtmlOptions = merge(defaultConfig, get(config, 'build.posthtml.options', {}))
  const replacements = direct ? config : get(config, 'safeClassNames', {
    '{': '{',
    '}': '}'
  })

  return posthtml([safeClassNames({replacements})]).process(html, posthtmlOptions).then(result => result.html)
}

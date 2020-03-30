const posthtml = require('posthtml')
const Tailwind = require('../generators/tailwind')
const posthtmlContent = require('posthtml-content')

module.exports = async (html, config, options = config.build.posthtml.options || {}) => {
  const replacements = config.transformContents || {}
  replacements.postcss = css => Tailwind.fromString(css, html, false, config)

  return posthtml([posthtmlContent(replacements)]).process(html, options).then(result => result.html)
}

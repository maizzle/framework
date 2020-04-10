const posthtml = require('posthtml')
const Tailwind = require('../generators/tailwind')
const posthtmlContent = require('posthtml-content')
const {getPropValue} = require('../utils/helpers')

module.exports = async (html, config) => {
  const replacements = config.transformContents || {}
  const options = getPropValue(config, 'build.posthtml.options') || {}

  replacements.postcss = css => Tailwind.fromString(css, html, false, config)

  return posthtml([posthtmlContent(replacements)]).process(html, options).then(result => result.html)
}

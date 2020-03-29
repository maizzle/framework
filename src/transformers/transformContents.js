const posthtml = require('posthtml')
const Tailwind = require('../generators/tailwind')
const posthtmlContent = require('posthtml-content')

module.exports = async (html, config) => {
  const replacements = config.transformContents || {}
  replacements.postcss = css => Tailwind.fromString(css, html, false, config)

  html = await posthtml([posthtmlContent(replacements)]).process(html).then(result => result.html)

  return html
}

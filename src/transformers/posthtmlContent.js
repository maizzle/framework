const posthtml = require('posthtml')
const Tailwind = require('../generators/tailwind')
const posthtmlContent = require('posthtml-content')

module.exports = async (html, config) => {
  let replacements = config.transformContents || {}
  replacements.postcss = (css) => Tailwind.fromString(css, html, false, config)

  replacements = Object.keys(replacements)
    .sort()
    .reduce((acc, key) => ({
      ...acc, [key]: replacements[key]
    }), {})

  html = await posthtml([posthtmlContent(replacements)]).process(html).then(res => res.html)

  return html
}

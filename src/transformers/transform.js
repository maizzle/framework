const {get} = require('lodash')
const posthtml = require('posthtml')
const Tailwind = require('../generators/tailwindcss')
const posthtmlContent = require('posthtml-content')

module.exports = async (html, config) => {
  const replacements = config.transform || {}
  const posthtmlOptions = get(config, 'build.posthtml.options', {})

  replacements.postcss = css => Tailwind.compile(css, html, {}, config)

  return posthtml([posthtmlContent(replacements)]).process(html, posthtmlOptions).then(result => result.html)
}

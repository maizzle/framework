const {get} = require('lodash')
const posthtml = require('posthtml')
const posthtmlContent = require('posthtml-content')
const Tailwind = require('../generators/tailwindcss')

module.exports = async (html, config = {}, direct = false) => {
  const replacements = direct ? config : get(config, 'transform', {})
  const posthtmlOptions = get(config, 'build.posthtml.options', {})

  replacements.postcss = css => Tailwind.compile(css, html, {}, config)

  return posthtml([posthtmlContent(replacements)]).process(html, posthtmlOptions).then(result => result.html)
}

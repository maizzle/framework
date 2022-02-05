const posthtml = require('posthtml')
const posthtmlContent = require('posthtml-content')
const Tailwind = require('../generators/tailwindcss')
const {get, omit} = require('lodash')

module.exports = async (html, config = {}, direct = false) => {
  const replacements = direct ? config : get(config, 'transform', {})
  const posthtmlOptions = get(config, 'build.posthtml.options', {})

  /**
   * Compile CSS in <style postcss> tags with PostCSS and Tailwind CSS
   */
  const maizzleConfig = omit(config, ['build.tailwind.css', 'css'])
  const tailwindConfig = get(config, 'build.tailwind.config', 'tailwind.config.js')

  const compileCss = css => Tailwind.compile(css, html, tailwindConfig, maizzleConfig)

  replacements.tailwindcss = css => compileCss(`@tailwind components; @tailwind utilities; ${css}`)
  replacements.postcss = css => compileCss(`@tailwind components; @tailwind utilities; ${css}`)

  return posthtml([posthtmlContent(replacements)]).process(html, posthtmlOptions).then(result => result.html)
}

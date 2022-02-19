const posthtml = require('posthtml')
const {get, omit} = require('lodash')
const posthtmlContent = require('posthtml-content')
const Tailwind = require('../generators/tailwindcss')

module.exports = async (html, config = {}, direct = false) => {
  const replacements = direct ? config : get(config, 'transform', {})
  const posthtmlOptions = get(config, 'build.posthtml.options', {})

  /**
   * Compile CSS in <style {post|tailwind}css> tags
   */
  const maizzleConfig = omit(config, ['build.tailwind.css', 'css'])
  const tailwindConfig = get(config, 'build.tailwind.config', 'tailwind.config.js')

  const compileCss = css => Tailwind.compile(css, html, tailwindConfig, maizzleConfig)

  replacements.postcss = css => compileCss(css)
  replacements.tailwindcss = css => compileCss(`@tailwind components; @tailwind utilities; ${css}`)

  return posthtml([styleDataEmbed(), posthtmlContent(replacements)]).process(html, posthtmlOptions).then(result => result.html)
}

/**
 * Prevent CSS inlining
 *
 * Add a `data-embed` attribute to <style> tags that we want to preserve.
 * Can be used for HTML email client targeting hacks.
 */
const styleDataEmbed = () => tree => {
  const process = node => {
    if (
      node.tag === 'style'
      && node.attrs
      && (node.attrs.hasOwnProperty('preserve') || node.attrs.hasOwnProperty('embed'))) { // eslint-disable-line
      node.attrs = {...node.attrs, 'data-embed': true}
      node.attrs.preserve = false
      node.attrs.embed = false
    }

    return node
  }

  return tree.walk(process)
}

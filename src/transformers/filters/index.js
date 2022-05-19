const posthtml = require('posthtml')
const {get, omit, has, merge} = require('lodash')
const defaultFilters = require('./defaultFilters')
const PostCSS = require('../../generators/postcss')
const posthtmlContent = require('posthtml-content')
const Tailwind = require('../../generators/tailwindcss')
const safeClassNames = require('posthtml-safe-class-names')

module.exports = async (html, config = {}, direct = false) => {
  const filters = direct ?
    merge(defaultFilters, config) :
    merge(defaultFilters, get(config, 'filters', {}))

  const posthtmlOptions = get(config, 'build.posthtml.options', {})

  /**
   * Compile CSS in <style {post|tailwind}css> tags
   */
  const maizzleConfig = omit(config, ['build.tailwind.css', 'css'])
  const tailwindConfig = get(config, 'build.tailwind.config', 'tailwind.config.js')

  filters.postcss = css => PostCSS.process(css, maizzleConfig)
  filters.tailwindcss = css => Tailwind.compile(css, html, tailwindConfig, maizzleConfig)

  return posthtml([
    styleDataEmbed(),
    posthtmlContent(filters),
    safeClassNames()
  ])
    .process(html, posthtmlOptions)
    .then(result => result.html)
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
      && (has(node.attrs, 'preserve') || has(node.attrs, 'embed'))) {
      node.attrs = {...node.attrs, 'data-embed': true}
      node.attrs.preserve = false
      node.attrs.embed = false
    }

    return node
  }

  return tree.walk(process)
}

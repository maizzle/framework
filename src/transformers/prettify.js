import pretty from 'pretty'
import posthtml from 'posthtml'
import { defu as merge } from 'defu'
import { render } from 'posthtml-render'
import { parser as parse } from 'posthtml-parser'
import { getPosthtmlOptions } from '../posthtml/defaultConfig.js'

const posthtmlPlugin = (options = {}, posthtmlOptions = {}) => tree => {
  const defaultConfig = {
    space_around_combinator: true, // Preserve space around CSS selector combinators
    newline_between_rules: false, // Remove empty lines between CSS rules
    indent_inner_html: false, // Helps reduce file size
    extra_liners: [] // Don't add extra new line before any tag
  }

  const config = merge(options, defaultConfig)

  return parse(pretty(render(tree), config), posthtmlOptions)
}

export default posthtmlPlugin

export async function prettify(html = '', options = {}, posthtmlOptions = {}) {
  posthtmlOptions = getPosthtmlOptions(posthtmlOptions)

  return posthtml([
    posthtmlPlugin(options, posthtmlOptions)
  ])
    .process(html, posthtmlOptions)
    .then(result => result.html)
}

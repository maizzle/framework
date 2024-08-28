import pretty from 'pretty'
import posthtml from 'posthtml'
import { defu as merge } from 'defu'
import { render } from 'posthtml-render'
import { parser as parse } from 'posthtml-parser'
import posthtmlConfig from '../posthtml/defaultConfig.js'

const posthtmlPlugin = (options = {}) => tree => {
  const defaultConfig = {
    space_around_combinator: true, // Preserve space around CSS selector combinators
    newline_between_rules: false, // Remove empty lines between CSS rules
    indent_inner_html: false, // Helps reduce file size
    extra_liners: [] // Don't add extra new line before any tag
  }

  const config = merge(options, defaultConfig)

  return parse(pretty(render(tree), config), posthtmlConfig)
}

export default posthtmlPlugin

export async function prettify(html = '', options = {}, posthtmlOptions = {}) {
  return posthtml([
    posthtmlPlugin(options)
  ])
    .process(html, merge(posthtmlOptions, posthtmlConfig))
    .then(result => result.html)
}

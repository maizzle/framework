/* eslint-disable camelcase */

const pretty = require('pretty')
const {get, merge, isEmpty} = require('lodash')

module.exports = async (html, config = {}, direct = false) => {
  if (get(config, 'prettify') === false) {
    return html
  }

  const defaultConfig = {
    space_around_combinator: true, // Preserve space around CSS selector combinators
    newline_between_rules: false, // Remove empty lines between CSS rules
    indent_inner_html: false, // Helps reduce file size
    extra_liners: [] // Don't add extra new line before any tag
  }

  config = direct ? config : merge(defaultConfig, get(config, 'prettify', {}))

  if (typeof config === 'boolean' && config) {
    return pretty(html, defaultConfig)
  }

  if (!isEmpty(config)) {
    return pretty(html, config)
  }

  return html
}

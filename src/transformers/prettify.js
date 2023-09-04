/* eslint-disable camelcase */
const pretty = require('pretty')
const {merge} = require('../utils/helpers')
const {get, isEmpty, isObject} = require('lodash')

module.exports = async (html, config = {}, direct = false) => {
  const defaultConfig = {
    space_around_combinator: true, // Preserve space around CSS selector combinators
    newline_between_rules: false, // Remove empty lines between CSS rules
    indent_inner_html: false, // Helps reduce file size
    extra_liners: [] // Don't add extra new line before any tag
  }

  config = direct ? config : get(config, 'prettify')

  // Don't prettify if not explicitly enabled in config
  if (!config || (isObject(config) && isEmpty(config))) {
    return html
  }

  if (typeof config === 'boolean' && config) {
    return pretty(html, defaultConfig)
  }

  config = merge(defaultConfig, config)

  return pretty(html, config)
}

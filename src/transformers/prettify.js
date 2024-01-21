const {format} = require('prettier')
const {get, merge, isEmpty, isObject} = require('lodash')

module.exports = async (html, config = {}, direct = false) => {
  config = direct ? config : get(config, 'prettify')

  const defaultConfig = {
    parser: 'html',
    printWidth: 500,
    embeddedLanguageFormatting: 'off',
    htmlWhitespaceSensitivity: 'ignore',
    xmlMode: get(config, 'posthtml.options.xmlMode', false)
  }

  // Don't prettify if not explicitly enabled in config
  if (!config || (isObject(config) && isEmpty(config))) {
    return html
  }

  if (typeof config === 'boolean' && config) {
    return format(html, defaultConfig).then(html => reFormat(html, defaultConfig))
  }

  config = merge(defaultConfig, config)

  return format(html, config).then(html => reFormat(html, config))
}

const reFormat = (html, config) => {
  if (/<!doctype html>/i.test(html) && !config.xmlMode) {
    html = html.replace(/<(.+?)(\s\/)>/g, '<$1>')
  }

  return html
}

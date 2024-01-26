const {format} = require('prettier')
const {get, merge, isEmpty, isObject} = require('lodash')

module.exports = async (html, config = {}, direct = false) => {
  config = direct ? config : get(config, 'prettify')

  const defaultConfig = {
    parser: 'html',
    printWidth: 500,
    htmlWhitespaceSensitivity: 'ignore',
    xmlMode: get(config, 'posthtml.options.xmlMode', false),
    rewriteSelfClosing: true,
    selfClosingTags: [
      'area',
      'base',
      'br',
      'col',
      'embed',
      'hr',
      'img',
      'input',
      'link',
      'meta',
      'param',
      'source',
      'track',
      'wbr'
    ]
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
  if (/<!doctype html>/i.test(html) && !config.xmlMode && config.rewriteSelfClosing) {
    html = html.replace(new RegExp(`<(${config.selfClosingTags.join('|')})\s?([^>]*?)\s?\/>`, 'g'), (match, p1, p2) => {
      return `<${p1}${p2.trimEnd()}>`
    })
  }

  return html
    // Fix style="" attributes broken down on multiple lines
    .replace(/(\s+style="\s+)([\s\S]*?)(\s+")/g, (match, p1, p2, p3) => {
      return p1.replace(/\n\s+?(style)/g, ' $1').trimEnd()
        + p2.replace(/\s+/g, ' ').trim()
        + p3.trim()
    })
    // Fix closing </pre> tags broken down on multiple lines (</pre>\n\s+>)
    .replace(/(<\/pre)\s+>/g, '$1>')
    // Undo escaping of quotes in attribute values
    .replace(/="(.*?)"/g, (match, p1) => {
      return `="${p1.replace(/&quot;/g, '\'')}"`
    })
    // Fix <tag \n\s+{attrs}\n\s+> => <tag {attrs}>
    .replace(/<([^>]+)\n\s*([^>]+)\n\s*>/g, '<$1 $2>')
    // Fix <tag {attrs}\n[\s\t]*> => <tag {attrs}>
    .replace(/<([^>]+)\n\s*>/g, '<$1>')
}

const posthtml = require('posthtml')
const parseAttrs = require('posthtml-attrs-parser')

module.exports = async (html, config, options = config.build.posthtml.options || {}) => {
  const prefers = config.preferBgColorAttribute

  if ((typeof prefers === 'boolean' && prefers) || (prefers && prefers.enabled)) {
    const tags = prefers ? prefers.tags : []
    html = await posthtml([removeInlineBGColor({ tags: tags })]).process(html, options).then(result => result.html)
  }

  return html
}

const removeInlineBGColor = (options = {}) => tree => {
  options.tags = options.tags || ['body', 'marquee', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr']

  const process = node => {
    if (!options.tags.includes(node.tag)) return node

    const attrs = parseAttrs(node.attrs, {
      rules: {
        bgcolor: {
          delimiter: /\s+/,
          glue: ' '
        }
      }
    })

    if (attrs.style && attrs.style['background-color']) {
      attrs.bgcolor = attrs.style['background-color']
      delete attrs.style['background-color']
      node.attrs = attrs.compose()
      node.attrs.style = node.attrs.style.substr(-1) === ';' ? node.attrs.style : node.attrs.style + ';'
    }

    return node
  }

  return tree.walk(process)
}

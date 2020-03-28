const posthtml = require('posthtml')
const parseAttrs = require('posthtml-attrs-parser')

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

module.exports = async (html, config) => {
  const prefers = config.cleanup.preferBgColorAttribute
  const tags = prefers ? prefers.tags : []
  if (prefers || (prefers && prefers.enabled)) {
    html = await posthtml([removeInlineBGColor({ tags: tags })]).process(html).then(response => response.html)
  }

  return html
}

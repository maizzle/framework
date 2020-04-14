const posthtml = require('posthtml')
const parseAttrs = require('posthtml-attrs-parser')
const {getPropValue, isObject} = require('../utils/helpers')

module.exports = async (html, config) => {
  const prefers = getPropValue(config, 'inlineCSS.preferBgColorAttribute')
  const options = getPropValue(config, 'build.posthtml.options') || {}

  if ((typeof prefers === 'boolean' && prefers)) {
    return posthtml([removeInlineBGColor()]).process(html, options).then(result => result.html)
  }

  if (isObject(prefers) && prefers.enabled) {
    const tags = getPropValue(prefers, 'tags')
    return posthtml([removeInlineBGColor({tags})]).process(html, options).then(result => result.html)
  }

  return html
}

const removeInlineBGColor = (options = {}) => tree => {
  options.tags = options.tags || ['body', 'marquee', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr']

  const process = node => {
    if (!options.tags.includes(node.tag)) {
      return node
    }

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
    }

    return node
  }

  return tree.walk(process)
}

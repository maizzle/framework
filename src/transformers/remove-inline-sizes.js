const posthtml = require('posthtml')
const parseAttrs = require('posthtml-attrs-parser')
const {getPropValue, isObject} = require('../utils/helpers')

module.exports = async (html, config) => {
  if (!isObject(config.keepOnlyAttributeSizes)) {
    const options = getPropValue(config, 'build.posthtml.options') || {}
    html = await posthtml([removeInlineSizes(config.keepOnlyAttributeSizes)]).process(html, options).then(result => result.html)
  }

  return html
}

const removeInlineSizes = (mappings = {}) => tree => {
  const process = node => {
    const attrs = parseAttrs(node.attrs)
    const tag = node.tag ? node.tag.toUpperCase() : ''

    Object.entries(mappings).forEach(([attribute, tags]) => {
      tags = Object.values(tags)
      if (!tags.includes(tag)) {
        return node
      }

      tags.forEach(() => {
        if (attrs.style) {
          delete attrs.style[attribute]
        }
      })
    })

    node.attrs = attrs.compose()

    if (attrs.style) {
      node.attrs.style = node.attrs.style.slice(-1) === ';' ? node.attrs.style : node.attrs.style + ';'
    }

    return node
  }

  return tree.walk(process)
}

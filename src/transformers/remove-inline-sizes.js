const posthtml = require('posthtml')
const parseAttrs = require('posthtml-attrs-parser')
const {getPropValue, isEmptyObject} = require('../utils/helpers')

module.exports = async (html, config) => {
  const settings = getPropValue(config, 'inlineCSS.keepOnlyAttributeSizes') || {}

  if (!isEmptyObject(settings)) {
    const options = getPropValue(config, 'build.posthtml.options') || {}
    html = await posthtml([removeInlineSizes(settings)]).process(html, options).then(result => result.html)
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

    return node
  }

  return tree.walk(process)
}

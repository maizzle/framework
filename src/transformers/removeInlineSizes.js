const posthtml = require('posthtml')
const {get, merge, isEmpty} = require('lodash')
const parseAttrs = require('posthtml-attrs-parser')
const {toStyleString} = require('../utils/helpers')
const defaultConfig = require('../generators/posthtml/defaultConfig')

module.exports = async (html, config = {}, direct = false) => {
  const settings = direct ? config : get(config, 'inlineCSS.keepOnlyAttributeSizes', {})

  if (!isEmpty(settings)) {
    const posthtmlOptions = merge(defaultConfig, get(config, 'build.posthtml.options', {}))

    return posthtml([removeInlineSizes(settings)]).process(html, posthtmlOptions).then(result => result.html)
  }

  return html
}

const removeInlineSizes = (mappings = {}) => tree => {
  const process = node => {
    Object.entries(mappings).forEach(([attribute, tags]) => {
      tags = Object.values(tags).map(tag => tag.toLowerCase())
      if (!tags.includes(node.tag)) {
        return node
      }

      const attrs = parseAttrs(node.attrs)

      tags.forEach(() => {
        if (get(node, 'attrs.style')) {
          delete attrs.style[attribute]

          node.attrs.style = toStyleString(attrs.style)
        }
      })
    })

    return node
  }

  return tree.walk(process)
}

const posthtml = require('posthtml')
const {get, isEmpty} = require('lodash')
const parseAttrs = require('posthtml-attrs-parser')

module.exports = async (html, config) => {
  const settings = get(config, 'inlineCSS.keepOnlyAttributeSizes', {})

  if (!isEmpty(settings)) {
    const posthtmlOptions = get(config, 'build.posthtml.options', {})
    html = await posthtml([removeInlineSizes(settings)]).process(html, posthtmlOptions).then(result => result.html)
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

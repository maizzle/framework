const posthtml = require('posthtml')
const {merge} = require('../utils/helpers')
const parseAttrs = require('posthtml-attrs-parser')
const defaultConfig = require('../generators/posthtml/defaultConfig')
const {get, forEach, intersection, keys, isEmpty} = require('lodash')

module.exports = async (html, config = {}, direct = false) => {
  const posthtmlOptions = merge(defaultConfig, get(config, 'build.posthtml.options', {}))
  const attributes = get(config, 'inlineCSS.attributeToStyle', false)

  if (typeof attributes === 'boolean' && attributes) {
    return posthtml([attributesToStyle()]).process(html, posthtmlOptions).then(result => result.html)
  }

  if (Array.isArray(attributes) && !isEmpty(attributes)) {
    return posthtml([attributesToStyle({attributes})]).process(html, posthtmlOptions).then(result => result.html)
  }

  if (direct) {
    return posthtml([
      attributesToStyle({
        attributes: Array.isArray(config) ? config : []
      })
    ]).process(html, posthtmlOptions).then(result => result.html)
  }

  return html
}

const attributesToStyle = (options = {}) => tree => {
  options.attributes = options.attributes || ['width', 'height', 'bgcolor', 'background', 'align', 'valign']

  const process = node => {
    const nodeAttributes = parseAttrs(node.attrs)
    const matches = intersection(keys(nodeAttributes), options.attributes)
    const nodeStyle = get(node.attrs, 'style')
    const cssToInline = []

    forEach(matches, attribute => {
      let value = get(node.attrs, attribute)

      switch (attribute) {
        case 'bgcolor':
          cssToInline.push(`background-color: ${value}`)
          break

        case 'background':
          cssToInline.push(`background-image: url('${value}')`)
          break

        case 'width':
          value = Number.parseInt(value, 10) + (value.match(/px|%/) || 'px')
          cssToInline.push(`width: ${value}`)
          break

        case 'height':
          value = Number.parseInt(value, 10) + (value.match(/px|%/) || 'px')
          cssToInline.push(`height: ${value}`)
          break

        case 'align':
          if (node.tag !== 'table') {
            return cssToInline.push(`text-align: ${value}`)
          }

          if (['left', 'right'].includes(value)) {
            cssToInline.push(`float: ${value}`)
          }

          if (value === 'center') {
            cssToInline.push('margin-left: auto', 'margin-right: auto')
          }

          break

        case 'valign':
          cssToInline.push(`vertical-align: ${value}`)
          break

        // No default
      }
    })

    nodeAttributes.style = nodeStyle ? `${nodeStyle} ${cssToInline.join('; ')}` : `${cssToInline.join('; ')}`

    node.attrs = nodeAttributes.compose()

    return node
  }

  return tree.walk(process)
}

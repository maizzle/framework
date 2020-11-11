const posthtml = require('posthtml')
const parseAttrs = require('posthtml-attrs-parser')
const {get, forEach, intersection, keys, isEmpty} = require('lodash')

module.exports = async (html, config = {}, direct = false) => {
  if (direct) {
    return posthtml([
      attributesToStyle({
        attributes: Array.isArray(config) ? config : []
      })
    ]).process(html).then(result => result.html)
  }

  const posthtmlOptions = get(config, 'build.posthtml.options', {})
  const attributes = get(config, 'inlineCSS.attributeToStyle', false)

  if (typeof attributes === 'boolean' && attributes) {
    return posthtml([attributesToStyle()]).process(html, posthtmlOptions).then(result => result.html)
  }

  if (Array.isArray(attributes) && !isEmpty(attributes)) {
    return posthtml([attributesToStyle({attributes})]).process(html, posthtmlOptions).then(result => result.html)
  }

  return html
}

const attributesToStyle = (options = {}) => tree => {
  options.attributes = options.attributes || ['width', 'height', 'bgcolor', 'background', 'align', 'valign']

  const process = node => {
    const nodeAttributes = parseAttrs(node.attrs)
    const matches = intersection(keys(nodeAttributes), options.attributes)
    const nodeStyle = get(node.attrs, 'style')
    const csstoInline = []

    forEach(matches, attribute => {
      let value = get(node.attrs, attribute)

      switch (attribute) {
        case 'bgcolor':
          csstoInline.push(`background-color: ${value}`)
          break

        case 'background':
          csstoInline.push(`background-image: url('${value}')`)
          break

        case 'width':
          value = Number.parseInt(value, 10) + (value.match(/px|%/) || 'px')
          csstoInline.push(`width: ${value}`)
          break

        case 'height':
          value = Number.parseInt(value, 10) + (value.match(/px|%/) || 'px')
          csstoInline.push(`height: ${value}`)
          break

        case 'align':
          if (node.tag !== 'table') {
            return csstoInline.push(`text-align: ${value}`)
          }

          if (['left', 'right'].includes(value)) {
            csstoInline.push(`float: ${value}`)
          }

          if (value === 'center') {
            csstoInline.push('margin-left: auto', 'margin-right: auto')
          }

          break

        case 'valign':
          csstoInline.push(`vertical-align: ${value}`)
          break

        // No default
      }
    })

    nodeAttributes.style = nodeStyle ? `${nodeStyle} ${csstoInline.join('; ')}` : `${csstoInline.join('; ')}`

    node.attrs = nodeAttributes.compose()

    return node
  }

  return tree.walk(process)
}

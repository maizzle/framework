import posthtml from 'posthtml'
import get from 'lodash-es/get.js'
import keys from 'lodash-es/keys.js'
import forEach from 'lodash-es/forEach.js'
import parseAttrs from 'posthtml-attrs-parser'
import intersection from 'lodash-es/intersection.js'

const posthtmlPlugin = (attributes = []) => tree => {
  if (!Array.isArray(attributes)) {
    return tree
  }

  if (attributes.length === 0) {
    return tree
  }

  const process = node => {
    if (!node.attrs) {
      return node
    }

    const nodeAttributes = parseAttrs(node.attrs)
    const matches = intersection(keys(nodeAttributes), attributes)
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

    nodeAttributes.style = nodeStyle ? `${nodeStyle.split(';').join(';')} ${cssToInline.join('; ')}` : `${cssToInline.join('; ')}`

    node.attrs = nodeAttributes.compose()

    return node
  }

  return tree.walk(process)
}

export default posthtmlPlugin

export async function attributeToStyle(html = '', attributes = [], posthtmlOptions = {}) {
  return posthtml([
    posthtmlPlugin(attributes)
  ])
    .process(html, posthtmlOptions)
    .then(result => result.html)
}

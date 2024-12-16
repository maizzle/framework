import posthtml from 'posthtml'
import get from 'lodash-es/get.js'
import { getPosthtmlOptions } from '../posthtml/defaultConfig.js'

/**
 * Remove empty attributes with PostHTML
 *
 * Condition 1:
 * `boolean` is for attributes without ="" (respects `recognizeNoValueAttribute` in PostHTML)
 * `''` if the attribute included ="", i.e. style=""
 *
 * Condition 2: attribute value is a string and matches the one on the node
 *
 * Condition 3: same as 2, but for regular expressions
 */
const posthtmlPlugin = (attributes = [], posthtmlOptions = {}) => tree => {
  attributes.push('style', 'class')

  const process = node => {
    const normalizedAttrs = attributes.map(attribute => {
      return {
        name: get(attribute, 'name', typeof attribute === 'string' ? attribute : false),
        value: get(attribute, 'value', get(posthtmlOptions, 'recognizeNoValueAttributes', true))
      }
    })

    if (node.attrs) {
      normalizedAttrs.forEach(attr => {
        const targetAttrValue = get(node.attrs, attr.name)

        if (
          typeof targetAttrValue === 'boolean' || targetAttrValue === '' ||
          (typeof attr.value === 'string' && node.attrs[attr.name] === attr.value) ||
          (attr.value instanceof RegExp && attr.value.test(node.attrs[attr.name]))
        ) {
          node.attrs[attr.name] = false
        }
      })
    }

    return node
  }

  return tree.walk(process)
}

export default posthtmlPlugin

export async function removeAttributes(html = '', attributes = [], posthtmlOptions = {}) {
  return posthtml([
    posthtmlPlugin(attributes, getPosthtmlOptions(posthtmlOptions))
  ])
    .process(html, getPosthtmlOptions())
    .then(result => result.html)
}

const posthtml = require('posthtml')
const {get, merge} = require('lodash')
const defaultConfig = require('../generators/posthtml/defaultConfig')

module.exports = async (html, config = {}, direct = false) => {
  const attributes = direct ? (Array.isArray(config) ? [...config] : []) : get(config, 'removeAttributes', [])
  const posthtmlOptions = merge(defaultConfig, get(config, 'build.posthtml.options', {}))

  attributes.push('style', 'class')

  html = await posthtml([
    removeAttributes(attributes, posthtmlOptions)
  ]).process(html, posthtmlOptions).then(result => result.html)

  return html
}

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
const removeAttributes = (attributes = {}, posthtmlOptions = {}) => tree => {
  const process = node => {
    const normalizedAttrs = attributes.map(attribute => {
      return {
        name: get(attribute, 'name', typeof attribute === 'string' ? attribute : false),
        value: get(attribute, 'value', get(posthtmlOptions, 'recognizeNoValueAttributes', true))
      }
    })

    if (node.attrs) {
      for (const attr of normalizedAttrs) {
        const targetAttrValue = get(node.attrs, attr.name)

        if (
          typeof targetAttrValue === 'boolean' || targetAttrValue === '' ||
          (typeof attr.value === 'string' && node.attrs[attr.name] === attr.value) ||
          (attr.value instanceof RegExp && attr.value.test(node.attrs[attr.name]))
        ) {
          node.attrs[attr.name] = false
        }
      }
    }

    return node
  }

  return tree.walk(process)
}

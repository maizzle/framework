const posthtml = require('posthtml')
const {get, merge} = require('lodash')
const removeAttributes = require('posthtml-remove-attributes')
const defaultConfig = require('../generators/posthtml/defaultConfig')

module.exports = async (html, config = {}, direct = false) => {
  const attributes = direct ? (Array.isArray(config) ? [...config] : []) : get(config, 'removeAttributes', [])
  const posthtmlOptions = merge(defaultConfig, get(config, 'build.posthtml.options', {}))

  attributes.push({name: 'style'}, {name: 'class'})

  // Allow omitting `value` key when removing empty attributes
  attributes.forEach(attr => {
    attr.value = attr.value || ''
  })

  return posthtml([removeAttributes(attributes)]).process(html, posthtmlOptions).then(result => result.html)
}

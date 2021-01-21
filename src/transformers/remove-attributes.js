const {get} = require('lodash')
const posthtml = require('posthtml')
const removeAttributes = require('posthtml-remove-attributes')

module.exports = async (html, config = {}, direct = false) => {
  const attributes = direct ? (Array.isArray(config) ? [...config] : []) : get(config, 'removeAttributes', [])
  const posthtmlOptions = get(config, 'build.posthtml.options', {})

  attributes.push({name: 'style'}, {name: 'class'})

  // Allow ommiting `value` key when removing empty attributes
  attributes.forEach(attr => {
    attr.value = attr.value || ''
  })

  return posthtml([removeAttributes(attributes)]).process(html, posthtmlOptions).then(result => result.html)
}

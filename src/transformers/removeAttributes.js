const posthtml = require('posthtml')
const removeAttributes = require('posthtml-remove-attributes')
const { getPropValue } = require('../utils/helpers')

module.exports = async (html, config) => {
  const options = getPropValue(config, 'build.posthtml.options') || {}
  const attributes = typeof config.removeAttributes === 'object' ? config.removeAttributes : []

  attributes.push({ name: 'style' })

  // Allow ommiting `value` key when removing empty attributes
  attributes.map(attr => {
    attr.value = attr.value || ''
  })

  html = await posthtml([removeAttributes(attributes)]).process(html, options).then(result => result.html)

  return html
}

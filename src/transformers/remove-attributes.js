const posthtml = require('posthtml')
const removeAttributes = require('posthtml-remove-attributes')
const {getPropValue, isObject} = require('../utils/helpers')

module.exports = async (html, config) => {
  const options = getPropValue(config, 'build.posthtml.options') || {decodeEntities: false}
  const attributes = isObject(config.removeAttributes) ? config.removeAttributes : []

  attributes.push({name: 'style'})

  // Allow ommiting `value` key when removing empty attributes
  attributes.forEach(attr => {
    attr.value = attr.value || ''
  })

  html = await posthtml([removeAttributes(attributes)]).process(html, options).then(result => result.html)

  return html
}

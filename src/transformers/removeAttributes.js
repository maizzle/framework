const posthtml = require('posthtml')
const removeAttributes = require('posthtml-remove-attributes')

module.exports = async (html, config, options = config.build.posthtml.options || {}) => {
  const attributes = typeof config.removeAttributes === 'object' ? config.removeAttributes : []

  // Allow ommiting `value` key when removing empty attributes
  attributes.map(attr => {
    attr.value = attr.value || ''
  })

  html = await posthtml([removeAttributes(attributes)]).process(html, options).then(result => result.html)

  return html
}

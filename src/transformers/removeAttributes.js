const posthtml = require('posthtml')
const removeAttributes = require('posthtml-remove-attributes')

module.exports = async (html, config) => {
  const userDefinedAttributes = typeof config.removeAttributes === 'object' ? config.removeAttributes : []

  const attributes = [
    { name: 'class', value: '' },
    { name: 'style', value: '' },
    ...userDefinedAttributes
  ]

  // Allow ommiting `value` key when removing empty attributes
  attributes.map(attr => {
    attr.value = attr.value || ''
  })

  html = await posthtml([removeAttributes(attributes)]).process(html).then(result => result.html)

  return html
}

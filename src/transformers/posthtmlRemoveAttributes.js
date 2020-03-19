const posthtml = require('posthtml')
const removeAttributes = require('posthtml-remove-attributes')

module.exports = async (html, config) => {
  if (config.env === 'local') {
    return html
  }

  const userDefinedAttributes = config.cleanup && typeof config.cleanup.removeAttributes === 'object' ? config.cleanup.removeAttributes : []

  const attributes = [
    { name: 'class', value: '' },
    { name: 'style', value: '' },
    ...userDefinedAttributes
  ]

  html = await posthtml([removeAttributes(attributes)]).process(html).then(res => res.html)

  return html
}

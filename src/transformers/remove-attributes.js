const {get} = require('lodash')
const posthtml = require('posthtml')
const removeAttributes = require('posthtml-remove-attributes')

module.exports = async (html, config) => {
  const attributes = get(config, 'removeAttributes', [])
  const posthtmlOptions = get(config, 'build.posthtml.options', {})

  attributes.push({name: 'style'})

  // Allow ommiting `value` key when removing empty attributes
  attributes.forEach(attr => {
    attr.value = attr.value || ''
  })

  html = await posthtml([removeAttributes(attributes)]).process(html, posthtmlOptions).then(result => result.html)

  return html
}

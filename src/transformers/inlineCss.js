const juice = require('juice')
const {get, isObject, isEmpty} = require('lodash')

module.exports = async (html, config = {}, direct = false) => {
  if (get(config, 'inlineCSS') === false) {
    return html
  }

  const options = direct ? config : get(config, 'inlineCSS', {})
  // Default `removeStyleTags` to false so we can preserve
  // CSS selectors that are not present in the HTML
  const removeStyleTags = get(options, 'removeStyleTags', false)
  const css = get(config, 'customCSS', false)

  if (get(config, 'inlineCSS') === true || !isEmpty(options)) {
    options.applyAttributesTableElements = true
    juice.styleToAttribute = get(options, 'styleToAttribute', {'vertical-align': 'valign'})

    juice.widthElements = get(options, 'applyWidthAttributes', []).map(i => i.toUpperCase())
    juice.heightElements = get(options, 'applyHeightAttributes', []).map(i => i.toUpperCase())

    juice.excludedProperties = ['--tw-shadow']

    if (!isEmpty(options.excludedProperties)) {
      juice.excludedProperties.push(...get(options, 'excludedProperties', []))
    }

    if (isObject(options.codeBlocks) && !isEmpty(options.codeBlocks)) {
      Object.entries(options.codeBlocks).forEach(([k, v]) => {
        juice.codeBlocks[k] = v
      })
    }

    html = css ?
      juice.inlineContent(html, css, {removeStyleTags, ...options}) :
      juice(html, {removeStyleTags, ...options})

    return html
  }

  return html
}

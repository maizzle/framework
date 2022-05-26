const juice = require('juice')
const {get, isObject, isEmpty} = require('lodash')

module.exports = async (html, config = {}, direct = false) => {
  if (get(config, 'inlineCSS') === false) {
    return html
  }

  const options = direct ? config : get(config, 'inlineCSS', {})
  const removeStyleTags = get(options, 'removeStyleTags', false)
  const css = get(config, 'customCSS', false)

  if (get(config, 'inlineCSS') === true || !isEmpty(options)) {
    juice.styleToAttribute = get(options, 'styleToAttribute', {'vertical-align': 'valign'})

    juice.widthElements = get(options, 'applyWidthAttributes', [])
    juice.heightElements = get(options, 'applyHeightAttributes', [])

    juice.excludedProperties = ['--tw-shadow']

    if (!isEmpty(options.excludedProperties)) {
      juice.excludedProperties.push(...get(options, 'excludedProperties', []))
    }

    if (isObject(options.codeBlocks) && !isEmpty(options.codeBlocks)) {
      Object.entries(options.codeBlocks).forEach(([k, v]) => {
        juice.codeBlocks[k] = v
      })
    }

    html = css ? juice.inlineContent(html, css, {removeStyleTags}) : juice(html, {removeStyleTags})

    return html
  }

  return html
}

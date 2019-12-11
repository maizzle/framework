const juice = require('juice')

module.exports = async (html, config) => {
  const options = config.inlineCSS

  if (options && options.enabled) {
    if (options.styleToAttribute) {
      juice.styleToAttribute = options.styleToAttribute || juice.styleToAttribute
    }

    if (typeof options.applySizeAttribute === 'object') {
      juice.widthElements = typeof options.applySizeAttribute.width === 'object' ? Object.values(options.applySizeAttribute.width) : juice.widthElements
      juice.heightElements = typeof options.applySizeAttribute.height === 'object' ? Object.values(options.applySizeAttribute.height) : juice.heightElements
    }

    if (options.excludedProperties) {
      juice.excludedProperties = typeof options.excludedProperties === 'object' ? Object.values(options.excludedProperties) : juice.excludedProperties
    }

    if (options.codeBlocks) {
      Object.entries(options.codeBlocks).forEach(
        ([k, v]) => juice.codeBlocks[k] = v // eslint-disable-line
      )
    }

    return juice(html, { removeStyleTags: true })
  }

  return html
}

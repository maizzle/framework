const juice = require('juice')

module.exports = async (html, config) => {

  let options = config.inlineCSS

  if (options && options.enabled) {
    if (options.styleToAttribute) {
      juice.styleToAttribute = options.styleToAttribute || juice.styleToAttribute
    }

    if (options.applySizeAttribute) {
      juice.widthElements = Object.values(options.applySizeAttribute.width) || juice.widthElements
      juice.heightElements = Object.values(options.applySizeAttribute.height) || juice.heightElements
    }

    if (options.excludedProperties) {
      juice.excludedProperties = Object.values(options.excludedProperties) || juice.excludedProperties
    }

    if (options.codeBlocks) {
      Object.entries(options.codeBlocks).forEach(
        ([k, v]) => juice.codeBlocks[k] = v
      )
    }

    return juice(html, { removeStyleTags: true })
  }

  return html
}

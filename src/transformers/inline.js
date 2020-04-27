const juice = require('juice')
const posthtml = require('posthtml')
const mergeLonghand = require('posthtml-postcss-merge-longhand')
const {isObject, isEmptyObject, getPropValue} = require('../utils/helpers')

module.exports = async (html, config) => {
  const options = getPropValue(config, 'inlineCSS') || {}
  const removeStyleTags = typeof options.removeStyleTags === 'undefined' ? true : options.removeStyleTags

  if (!isEmptyObject(options) && options.enabled) {
    juice.styleToAttribute = isObject(options.styleToAttribute) ? options.styleToAttribute : juice.styleToAttribute

    if (isObject(options.applySizeAttribute)) {
      const widthElements = getPropValue(options, 'applySizeAttribute.width')
      const heightElements = getPropValue(options, 'applySizeAttribute.height')

      juice.widthElements = isObject(widthElements) ? Object.values(widthElements) : juice.widthElements
      juice.heightElements = isObject(heightElements) ? Object.values(heightElements) : juice.heightElements
    }

    if (isObject(options.excludedProperties)) {
      juice.excludedProperties = isEmptyObject(options.excludedProperties) ? juice.excludedProperties : Object.values(options.excludedProperties)
    }

    if (isObject(options.codeBlocks) && !isEmptyObject(options.codeBlocks)) {
      Object.entries(options.codeBlocks).forEach(([k, v]) => {
        juice.codeBlocks[k] = v
      })
    }

    html = juice(html, {removeStyleTags})

    const mergeLonghandConfig = getPropValue(options, 'mergeLonghand') || {enabled: false}
    const tags = getPropValue(mergeLonghandConfig, 'tags') || []

    if (mergeLonghandConfig || mergeLonghandConfig.enabled) {
      html = await posthtml([mergeLonghand({tags})]).process(html).then(result => result.html)
    }

    return html
  }

  return html
}

const juice = require('juice')
const posthtml = require('posthtml')
const {get, isObject, isEmpty} = require('lodash')
const mergeLonghand = require('posthtml-postcss-merge-longhand')

module.exports = async (html, config) => {
  const options = get(config, 'inlineCSS', {})
  const removeStyleTags = get(options, 'removeStyleTags', true)

  if (get(options, 'enabled', false)) {
    juice.styleToAttribute = get(options, 'styleToAttribute', juice.styleToAttribute)

    if (isObject(options.applySizeAttribute)) {
      juice.widthElements = get(options, 'applySizeAttribute.width', juice.widthElements)
      juice.heightElements = get(options, 'applySizeAttribute.height', juice.heightElements)
    }

    if (!isEmpty(options.excludedProperties)) {
      juice.excludedProperties = get(options, 'excludedProperties', Object.values(juice.excludedProperties))
    }

    if (isObject(options.codeBlocks) && !isEmpty(options.codeBlocks)) {
      Object.entries(options.codeBlocks).forEach(([k, v]) => {
        juice.codeBlocks[k] = v
      })
    }

    html = juice(html, {removeStyleTags})

    const posthtmlOptions = get(config, 'build.posthtml.options', {})
    const mergeLonghandConfig = get(options, 'mergeLonghand', {enabled: false})
    const tags = get(mergeLonghandConfig, 'tags', [])

    if (mergeLonghandConfig.enabled || (typeof mergeLonghandConfig === 'boolean' && mergeLonghandConfig)) {
      html = await posthtml([mergeLonghand({tags})]).process(html, posthtmlOptions).then(result => result.html)
    }

    return html
  }

  return html
}

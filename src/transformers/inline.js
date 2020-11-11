const juice = require('juice')
const posthtml = require('posthtml')
const {get, isObject, isEmpty} = require('lodash')
const mergeLonghand = require('posthtml-postcss-merge-longhand')

module.exports = async (html, config = {}, direct = false) => {
  const options = direct ? {...config, enabled: true} : get(config, 'inlineCSS', {})
  const removeStyleTags = get(options, 'removeStyleTags', true)
  const css = get(config, 'customCSS', false)

  if (get(options, 'enabled', false)) {
    juice.styleToAttribute = get(options, 'styleToAttribute', {'vertical-align': 'valign'})

    juice.widthElements = get(options, 'applyWidthAttributes', [])
    juice.heightElements = get(options, 'applyHeightAttributes', [])

    if (!isEmpty(options.excludedProperties)) {
      juice.excludedProperties = get(options, 'excludedProperties', Object.values(juice.excludedProperties))
    }

    if (isObject(options.codeBlocks) && !isEmpty(options.codeBlocks)) {
      Object.entries(options.codeBlocks).forEach(([k, v]) => {
        juice.codeBlocks[k] = v
      })
    }

    html = css ? juice.inlineContent(html, css, {removeStyleTags}) : juice(html, {removeStyleTags})

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

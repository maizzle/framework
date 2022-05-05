const juice = require('juice')
const posthtml = require('posthtml')
const {get, isObject, isEmpty} = require('lodash')
const mergeLonghand = require('posthtml-postcss-merge-longhand')

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

    const posthtmlOptions = get(config, 'build.posthtml.options', {})
    const mergeLonghandConfig = get(options, 'mergeLonghand', [])

    if (typeof mergeLonghandConfig === 'boolean' && mergeLonghandConfig) {
      html = await posthtml([mergeLonghand()]).process(html, posthtmlOptions).then(result => result.html)
    }

    if (isObject(mergeLonghandConfig) && !isEmpty(mergeLonghandConfig)) {
      html = await posthtml([mergeLonghand({tags: mergeLonghandConfig})]).process(html, posthtmlOptions).then(result => result.html)
    }

    return html
  }

  return html
}

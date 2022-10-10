const posthtml = require('posthtml')
const {get, merge, isObject, isEmpty} = require('lodash')
const mergeLonghand = require('posthtml-postcss-merge-longhand')
const defaultConfig = require('../generators/posthtml/defaultConfig')

module.exports = async (html, config, direct = false) => {
  config = direct ? (isObject(config) ? config : true) : get(config, 'shorthandInlineCSS', [])

  const posthtmlOptions = merge(defaultConfig, get(config, 'build.posthtml.options', {}))

  if (typeof config === 'boolean' && config) {
    html = await posthtml([mergeLonghand()]).process(html, posthtmlOptions).then(result => result.html)
  }

  if (isObject(config) && !isEmpty(config)) {
    html = await posthtml([mergeLonghand(config)]).process(html, posthtmlOptions).then(result => result.html)
  }

  return html
}

const posthtml = require('posthtml')
const {get, merge, isObject} = require('lodash')
const addAttributes = require('posthtml-extra-attributes')
const defaultConfig = require('../generators/posthtml/defaultConfig')

module.exports = async (html, config = {}, direct = false) => {
  if (get(config, 'extraAttributes') === false) {
    return html
  }

  const posthtmlOptions = merge(defaultConfig, get(config, 'build.posthtml.options', {}))

  let attributes = {
    table: {
      cellpadding: 0,
      cellspacing: 0,
      role: 'none'
    },
    img: {
      alt: ''
    }
  }

  attributes = direct
    ? {...attributes, ...config}
    : (
      isObject(config.extraAttributes)
        ? {...attributes, ...config.extraAttributes}
        : attributes
    )

  return posthtml([addAttributes({attributes})]).process(html, posthtmlOptions).then(result => result.html)
}

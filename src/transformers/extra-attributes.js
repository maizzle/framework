const posthtml = require('posthtml')
const {get, isObject} = require('lodash')
const addAttributes = require('posthtml-extra-attributes')

module.exports = async (html, config) => {
  let attributes = {
    table: {
      cellpadding: 0,
      cellspacing: 0,
      role: 'presentation'
    },
    img: {
      alt: ''
    }
  }

  if (isObject(config.extraAttributes)) {
    attributes = {...attributes, ...config.extraAttributes}
  }

  const posthtmlOptions = get(config, 'build.posthtml.options', {})

  html = posthtml([addAttributes({attributes})]).process(html, posthtmlOptions).then(result => result.html)

  return html
}

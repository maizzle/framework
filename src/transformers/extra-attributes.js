const posthtml = require('posthtml')
const {isObject, getPropValue} = require('../utils/helpers')
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

  const options = getPropValue(config, 'build.posthtml.options') || {decodeEntities: false}

  html = posthtml([addAttributes({attributes})]).process(html, options).then(result => result.html)

  return html
}

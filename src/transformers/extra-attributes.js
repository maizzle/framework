const posthtml = require('posthtml')
const {get, isObject} = require('lodash')
const addAttributes = require('posthtml-extra-attributes')

module.exports = async (html, config = {}, direct = false) => {
  if (get(config, 'extraAttributes') === false) {
    return html
  }

  const posthtmlOptions = get(config, 'build.posthtml.options', {})

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

  attributes = direct ? {...attributes, ...config} : (isObject(config.extraAttributes) ? {...attributes, ...config.extraAttributes} : attributes)

  return posthtml([addAttributes({attributes})]).process(html, posthtmlOptions).then(result => result.html)
}

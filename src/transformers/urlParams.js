const posthtml = require('posthtml')
const urlParams = require('posthtml-url-parameters')
const { isEmptyObject } = require('../utils/helpers')

module.exports = async (html, config, options = config.build.posthtml.options || {}) => {
  const { _options, ...parameters } = config.urlParameters
  const { tags, qs } = _options || { tags: ['a'], qs: { encode: false } }

  if (!isEmptyObject(parameters)) {
    return posthtml([
      urlParams({
        parameters: parameters,
        tags: tags,
        qs: qs
      })
    ]).process(html, options).then(result => result.html)
  }

  return html
}

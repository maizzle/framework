const posthtml = require('posthtml')
const urlParams = require('posthtml-url-parameters')
const {getPropValue, isObject, isEmptyObject} = require('../utils/helpers')

module.exports = async (html, config) => {
  if (isObject(config.urlParameters) && !isEmptyObject(config.urlParameters)) {
    const {_options, ...parameters} = config.urlParameters
    const {tags, qs} = _options || {tags: ['a'], qs: {encode: false}}
    const posthtmlOptions = getPropValue(config, 'build.posthtml.options') || {decodeEntities: false}

    return posthtml([urlParams({parameters, tags, qs})]).process(html, posthtmlOptions).then(result => result.html)
  }

  return html
}

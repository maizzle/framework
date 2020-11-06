const posthtml = require('posthtml')
const {get, isObject, isEmpty} = require('lodash')
const urlParams = require('posthtml-url-parameters')

module.exports = async (html, config) => {
  const urlParameters = get(config, 'urlParameters', {})

  if (isObject(urlParameters) && !isEmpty(urlParameters)) {
    const {_options, ...parameters} = urlParameters
    const {tags, qs} = _options || {tags: ['a'], qs: {encode: false}}
    const posthtmlOptions = get(config, 'build.posthtml.options', {})

    return posthtml([urlParams({parameters, tags, qs})]).process(html, posthtmlOptions).then(result => result.html)
  }

  return html
}

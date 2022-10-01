const posthtml = require('posthtml')
const {get, isEmpty} = require('lodash')
const urlParams = require('posthtml-url-parameters')

module.exports = async (html, config = {}, direct = false) => {
  const urlParameters = direct ? config : get(config, 'urlParameters', {})

  if (!isEmpty(urlParameters)) {
    const posthtmlOptions = get(config, 'build.posthtml.options', {})
    const {_options, ...parameters} = urlParameters
    const tags = get(_options, 'tags', ['a'])
    const strict = get(_options, 'strict', true)
    const qs = get(_options, 'qs', {encode: false})

    return posthtml([urlParams({parameters, tags, qs, strict})]).process(html, posthtmlOptions).then(result => result.html)
  }

  return html
}

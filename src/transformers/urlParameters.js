const posthtml = require('posthtml')
const {get, isEmpty} = require('lodash')
const urlParams = require('posthtml-url-parameters')

module.exports = async (html, config = {}, direct = false) => {
  const urlParameters = direct ? config : get(config, 'urlParameters', {})

  if (!isEmpty(urlParameters)) {
    const {_options, ...parameters} = urlParameters
    const tags = _options.tags ?? ['a']
    const strict = _options.strict ?? true
    const qs = _options.qs ?? {encode: false}
    const posthtmlOptions = get(config, 'build.posthtml.options', {})

    return posthtml([urlParams({parameters, tags, qs, strict})]).process(html, posthtmlOptions).then(result => result.html)
  }

  return html
}

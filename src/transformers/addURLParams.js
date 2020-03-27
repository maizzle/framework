const posthtml = require('posthtml')
const urlParams = require('posthtml-url-parameters')

module.exports = async (html, config) => {
  const { _options, ...parameters } = config.urlParameters
  const { tags, qs } = _options || {}

  html = await posthtml([
    urlParams({
      parameters: parameters,
      tags: tags,
      qs: qs
    })
  ]).process(html).then(result => result.html)

  return html
}

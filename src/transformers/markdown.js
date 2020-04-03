const posthtml = require('posthtml')
const markdown = require('posthtml-md2html')
const { getPropValue } = require('../utils/helpers')

module.exports = async (html, config) => {
  const options = getPropValue(config, 'build.posthtml.options') || {}

  return posthtml([markdown(config.markdown)]).process(html, options).then(result => result.html)
}

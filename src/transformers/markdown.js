const posthtml = require('posthtml')
const markdown = require('posthtml-markdownit')
const {getPropValue} = require('../utils/helpers')

module.exports = async (html, config) => {
  const posthtmlOptions = getPropValue(config, 'build.posthtml.options') || {}
  const markdownOptions = getPropValue(config, 'markdown') || {}

  return posthtml([markdown({...markdownOptions})]).process(html, posthtmlOptions).then(result => result.html)
}

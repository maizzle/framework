const posthtml = require('posthtml')
const markdown = require('posthtml-markdownit')
const {getPropValue} = require('../utils/helpers')
const deepmerge = require('deepmerge')

module.exports = async (html, config) => {
  const posthtmlOptions = getPropValue(config, 'build.posthtml.options') || {decodeEntities: false}
  const userMarkdownOptions = getPropValue(config, 'markdown') || {}
  const markdownOptions = deepmerge({markdownit: {html: true}}, userMarkdownOptions)

  return posthtml([
    markdown({...markdownOptions})
  ])
    .process(html, posthtmlOptions)
    .then(result => result.html)
}

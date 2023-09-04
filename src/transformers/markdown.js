const {get} = require('lodash')
const posthtml = require('posthtml')
const {merge} = require('../utils/helpers')
const markdown = require('posthtml-markdownit')
const defaultConfig = require('../generators/posthtml/defaultConfig')

module.exports = async (html, config = {}, direct = false) => {
  if (get(config, 'markdown') === false) {
    return html
  }

  const userMarkdownOptions = direct ? config : get(config, 'markdown', {})
  const posthtmlOptions = merge(defaultConfig, get(config, 'build.posthtml.options', {}))
  const markdownOptions = merge({markdownit: {html: true}}, userMarkdownOptions)

  return posthtml([
    markdown({...markdownOptions})
  ])
    .process(html, posthtmlOptions)
    .then(result => result.html)
}

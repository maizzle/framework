const posthtml = require('posthtml')
const {get, merge} = require('lodash')
const markdown = require('posthtml-markdownit')

module.exports = async (html, config = {}, direct = false) => {
  if (get(config, 'markdown') === false) {
    return html
  }

  const userMarkdownOptions = direct ? config : get(config, 'markdown', {})
  const posthtmlOptions = get(config, 'build.posthtml.options', {})
  const markdownOptions = merge({markdownit: {html: true}}, userMarkdownOptions)

  return posthtml([
    markdown({...markdownOptions})
  ])
    .process(html, posthtmlOptions)
    .then(result => result.html)
}

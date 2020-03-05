const posthtml = require('posthtml')
const markdown = require('posthtml-markdown')

module.exports = async (html, config) => {
  return posthtml([markdown(config.markdown)]).process(html).then(res => res.html)
}

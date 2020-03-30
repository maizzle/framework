const posthtml = require('posthtml')
const markdown = require('posthtml-md2html')

module.exports = async (html, config) => {
  return posthtml([markdown(config.markdown)]).process(html).then(result => result.html)
}

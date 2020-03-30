const posthtml = require('posthtml')
const markdown = require('posthtml-md2html')

module.exports = async (html, config, options = config.build.posthtml.options || {}) => {
  return posthtml([markdown(config.markdown)]).process(html, options).then(result => result.html)
}

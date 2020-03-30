const posthtml = require('posthtml')
const preventWidows = require('prevent-widows')

module.exports = async (html, config, options = config.build.posthtml.options || {}) => {
  return posthtml([preventWidows.posthtml()]).process(html, options).then(result => result.html)
}

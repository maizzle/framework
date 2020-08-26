const posthtml = require('posthtml')
const preventWidows = require('prevent-widows')
const {getPropValue} = require('../utils/helpers')

module.exports = async (html, config) => {
  const options = getPropValue(config, 'build.posthtml.options') || {}

  return posthtml([preventWidows.posthtml()]).process(html, options).then(result => result.html)
}

const {get} = require('lodash')
const posthtml = require('posthtml')
const preventWidows = require('prevent-widows')

module.exports = async (html, config) => {
  const posthtmlOptions = get(config, 'build.posthtml.options', {})

  return posthtml([preventWidows.posthtml()]).process(html, posthtmlOptions).then(result => result.html)
}

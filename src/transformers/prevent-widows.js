const {get} = require('lodash')
const posthtml = require('posthtml')
const preventWidows = require('prevent-widows')

module.exports = async (html, config = {}, direct = false) => {
  const posthtmlOptions = get(config, 'build.posthtml.options', {})

  if (direct) {
    return preventWidows(html)
  }

  return posthtml([preventWidows.posthtml()]).process(html, posthtmlOptions).then(result => result.html)
}

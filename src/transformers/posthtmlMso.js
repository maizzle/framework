const posthtml = require('posthtml')
const {get, merge} = require('lodash')
const outlook = require('posthtml-mso')
const defaultConfig = require('../generators/posthtml/defaultConfig')

module.exports = async (html, config) => {
  const outlookOptions = get(config, 'build.posthtml.outlook', {})
  const posthtmlOptions = merge(defaultConfig, get(config, 'build.posthtml.options', {}))

  return posthtml([outlook({...outlookOptions})]).process(html, posthtmlOptions).then(result => result.html)
}

const {get} = require('lodash')
const posthtml = require('posthtml')
const outlook = require('posthtml-mso')

module.exports = async (html, config) => {
  const outlookOptions = get(config, 'build.posthtml.outlook', {})
  const posthtmlOptions = get(config, 'build.posthtml.options', {})

  return posthtml([outlook({...outlookOptions})]).process(html, {...posthtmlOptions}).then(result => result.html)
}

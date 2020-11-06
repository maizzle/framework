const posthtml = require('posthtml')
const outlook = require('posthtml-mso')
const {getPropValue} = require('../utils/helpers')

module.exports = async (html, config) => {
  const outlookOptions = getPropValue(config, 'build.posthtml.outlook') || {}
  const posthtmlOptions = getPropValue(config, 'build.posthtml.options') || {}

  return posthtml([outlook({...outlookOptions})]).process(html, {...posthtmlOptions}).then(result => result.html)
}

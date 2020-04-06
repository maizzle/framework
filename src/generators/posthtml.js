const fm = require('front-matter')
const posthtml = require('posthtml')
const layouts = require('posthtml-extend')
const modules = require('posthtml-modules')
const includes = require('posthtml-include')
const expressions = require('posthtml-expressions')
const { getPropValue } = require('../utils/helpers')

module.exports = async (html, config) => {
  const layoutsOpts = getPropValue(config, 'build.layouts') || {}
  const modulesOpts = getPropValue(config, 'build.modules') || {}
  const posthtmlOpts = getPropValue(config, 'build.posthtml.options') || {}
  const posthtmlPlugins = getPropValue(config, 'build.posthtml.plugins') || []

  return posthtml([
    layouts({ strict: false, ...layoutsOpts }),
    includes(),
    modules({ ...modulesOpts }),
    expressions({ locals: { page: config } }),
    ...posthtmlPlugins
  ])
    .process(html, { ...posthtmlOpts })
    .then(result => fm(result.html).body)
    .catch(error => { throw error })
}

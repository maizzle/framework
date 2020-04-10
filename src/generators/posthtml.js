const fm = require('front-matter')
const posthtml = require('posthtml')
const fetch = require('posthtml-fetch')
const outlook = require('posthtml-mso')
const layouts = require('posthtml-extend')
const modules = require('posthtml-modules')
const includes = require('posthtml-include')
const expressions = require('posthtml-expressions')
const {getPropValue} = require('../utils/helpers')

module.exports = async (html, config) => {
  const layoutsOptions = getPropValue(config, 'build.layouts') || {}
  const modulesOptions = getPropValue(config, 'build.components') || {}
  const includeOptions = getPropValue(config, 'build.includes') || {}
  const fetchOptions = getPropValue(config, 'build.posthtml.fetch') || {}
  const outlookOptions = getPropValue(config, 'build.posthtml.outlook') || {}
  const posthtmlOptions = getPropValue(config, 'build.posthtml.options') || {}
  const posthtmlPlugins = getPropValue(config, 'build.posthtml.plugins') || []
  const expressionsOptions = getPropValue(config, 'build.posthtml.expressions') || {}

  return posthtml([
    layouts({strict: false, ...layoutsOptions}),
    includes({...includeOptions}),
    outlook({...outlookOptions}),
    fetch({...fetchOptions}),
    modules({tag: 'component', attribute: 'src', ...modulesOptions}),
    expressions({...expressionsOptions, locals: {page: config}}),
    ...posthtmlPlugins
  ])
    .process(html, {...posthtmlOptions})
    .then(result => fm(result.html).body)
    .catch(error => {
      throw error
    })
}

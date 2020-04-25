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

  const includeOptions = getPropValue(config, 'build.includes') || {}
  const includePlugin = includes({...includeOptions})

  const outlookOptions = getPropValue(config, 'build.posthtml.outlook') || {}
  const outlookPlugin = outlook({...outlookOptions})

  const fetchOptions = getPropValue(config, 'build.posthtml.fetch') || {}
  const fetchPlugin = fetch({...fetchOptions})

  const modulesOptions = getPropValue(config, 'build.components') || {}

  const posthtmlOptions = getPropValue(config, 'build.posthtml.options') || {}
  const posthtmlPlugins = getPropValue(config, 'build.posthtml.plugins') || []

  const expressionsOptions = getPropValue(config, 'build.posthtml.expressions') || {}
  const expressionsPlugin = expressions({...expressionsOptions, locals: {page: config}})

  return posthtml([
    layouts({strict: false, ...layoutsOptions}),
    includePlugin,
    outlookPlugin,
    fetchPlugin,
    modules({tag: 'component', attribute: 'src', plugins: [
      includePlugin,
      outlookPlugin,
      fetchPlugin,
      expressionsPlugin
    ], ...modulesOptions}),
    expressionsPlugin,
    ...posthtmlPlugins
  ])
    .process(html, {...posthtmlOptions})
    .then(result => fm(result.html).body)
}

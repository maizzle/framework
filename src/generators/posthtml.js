const {get} = require('lodash')
const fm = require('front-matter')
const posthtml = require('posthtml')
const fetch = require('posthtml-fetch')
const layouts = require('posthtml-extend')
const modules = require('posthtml-modules')
const expressions = require('posthtml-expressions')

module.exports = async (html, config) => {
  const layoutsOptions = get(config, 'build.layouts', {})

  const fetchOptions = get(config, 'build.posthtml.fetch', {})
  const fetchPlugin = fetch({...fetchOptions})

  const modulesOptions = get(config, 'build.components', {})
  // Fake `from` option so we can reference modules relatively
  const modulesRoot = modulesOptions.root || './'
  const modulesFrom = modulesOptions.from || `${modulesRoot}/fake`

  const posthtmlOptions = get(config, 'build.posthtml.options', {})
  const posthtmlPlugins = get(config, 'build.posthtml.plugins', [])

  const expressionsOptions = get(config, 'build.posthtml.expressions', {})
  const locals = {
    ...get(expressionsOptions, 'locals', {}),
    ...get(config, 'locals', {}),
    page: config
  }
  const expressionsPlugin = expressions({...expressionsOptions, locals})

  return posthtml([
    layouts({strict: false, ...layoutsOptions}),
    fetchPlugin,
    modules({
      from: modulesFrom,
      root: modulesRoot,
      tag: 'component',
      attribute: 'src',
      plugins: [
        fetchPlugin
      ],
      ...modulesOptions
    }),
    ...posthtmlPlugins,
    expressionsPlugin
  ])
    .process(html, {...posthtmlOptions})
    .then(result => fm(result.html).body)
}

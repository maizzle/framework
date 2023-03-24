const fm = require('front-matter')
const posthtml = require('posthtml')
const {get, merge} = require('lodash')
const fetch = require('posthtml-fetch')
const layouts = require('posthtml-extend')
const components = require('posthtml-component')
const defaultConfig = require('./defaultConfig')
const defaultComponentsConfig = require('./defaultComponentsConfig')

module.exports = async (html, config) => {
  const layoutsOptions = get(config, 'build.layouts', {})
  const componentsOptions = get(config, 'build.components', {})
  const expressionsOptions = merge(
    {
      loopTags: ['each', 'for'],
      strictMode: false
    },
    get(config, 'build.posthtml.expressions', {})
  )

  const posthtmlOptions = merge(defaultConfig, get(config, 'build.posthtml.options', {}))
  const posthtmlPlugins = get(config, 'build.posthtml.plugins', [])

  const locals = merge(
    get(expressionsOptions, 'locals', {}),
    get(config, 'locals', {}),
    {page: config}
  )

  const fetchPlugin = fetch(
    merge(
      {
        expressions: merge({...expressionsOptions, locals})
      },
      get(config, 'build.posthtml.fetch', {})
    )
  )

  const defaultComponentsOptions = merge(
    defaultComponentsConfig,
    {
      folders: [
        ...defaultComponentsConfig.folders,
        ...get(componentsOptions, 'folders', [])
      ]
    },
    {
      root: componentsOptions.root || './',
      expressions: {...expressionsOptions, locals}
    }
  )

  return posthtml([
    fetchPlugin,
    layouts(
      merge(
        {
          strict: false,
          expressions: merge({...expressionsOptions, locals})
        },
        layoutsOptions
      )
    ),
    components(
      merge(
        defaultComponentsOptions,
        componentsOptions
      )
    ),
    ...posthtmlPlugins
  ])
    .process(html, {...posthtmlOptions})
    .then(result => fm(result.html).body)
}

const fm = require('front-matter')
const posthtml = require('posthtml')
const fetch = require('posthtml-fetch')
const layouts = require('posthtml-extend')
const {get, merge, omit} = require('lodash')
const components = require('posthtml-component')
const defaultPosthtmlConfig = require('./defaultConfig')
const defaultComponentsConfig = require('./defaultComponentsConfig')

module.exports = async (html, config) => {
  const posthtmlOptions = merge(defaultPosthtmlConfig, get(config, 'build.posthtml.options', {}))
  const posthtmlPlugins = get(config, 'build.posthtml.plugins', [])

  const componentsUserOptions = get(config, 'build.components', {})

  const expressionsOptions = merge(
    {
      loopTags: ['each', 'for'],
      missingLocal: '{local}',
      strictMode: false
    },
    get(componentsUserOptions, 'expressions', {}),
    get(config, 'build.posthtml.expressions', {}),
  )

  const locals = merge(
    get(expressionsOptions, 'locals', {}),
    get(config, 'locals', {}),
    {page: config}
  )

  const fetchPlugin = fetch(
    merge(
      {
        expressions: merge(expressionsOptions, {locals})
      },
      get(config, 'build.posthtml.fetch', {})
    )
  )

  const componentsOptions = merge(
    {
      ...defaultComponentsConfig,
      folders: [
        ...get(componentsUserOptions, 'folders', []),
        ...defaultComponentsConfig.folders
      ],
      expressions: merge(expressionsOptions, {locals})
    },
    {
      root: componentsUserOptions.root || './'
    },
    /**
     * We omit `folders`, `root` and `expressions` in order to prevent duplicate
     * array values, as they are already added above
     */
    omit(componentsUserOptions, ['folders', 'root', 'expressions'])
  )

  return posthtml([
    fetchPlugin,
    layouts(
      merge(
        {
          strict: false,
          expressions: merge(expressionsOptions, {locals})
        },
        get(config, 'build.layouts', {})
      )
    ),
    components(componentsOptions),
    ...posthtmlPlugins
  ])
    .process(html, {...posthtmlOptions})
    .then(result => fm(result.html).body)
}

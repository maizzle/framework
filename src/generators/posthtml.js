const fm = require('front-matter')
const posthtml = require('posthtml')
const {get, merge} = require('lodash')
const fetch = require('posthtml-fetch')
const layouts = require('posthtml-extend')
const modules = require('posthtml-modules')
const expressions = require('posthtml-expressions')

module.exports = async (html, config) => {
  const layoutsOptions = get(config, 'build.layouts', {})

  const modulesOptions = get(config, 'build.components', {})
  // Fake `from` option so we can reference modules relatively
  const modulesRoot = modulesOptions.root || './'
  const modulesFrom = modulesOptions.from || `${modulesRoot}/fake`

  const posthtmlOptions = get(config, 'build.posthtml.options', {})
  const posthtmlPlugins = get(config, 'build.posthtml.plugins', [])

  const expressionsOptions = merge({strictMode: false}, get(config, 'build.posthtml.expressions', {}))

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

  return posthtml([
    fetchPlugin,
    expressions({...expressionsOptions, locals}),
    layouts(
      merge(
        {
          strict: false,
          expressions: merge({...expressionsOptions, locals})
        },
        layoutsOptions
      )
    ),
    modules({
      parser: posthtmlOptions,
      attributeAsLocals: true,
      from: modulesFrom,
      root: modulesRoot,
      tag: 'component',
      attribute: 'src',
      plugins: [
        fetchPlugin
      ],
      locals,
      ...modulesOptions
    }),
    ...posthtmlPlugins
  ])
    .process(html, {...posthtmlOptions})
    .then(result => fm(result.html).body)
}

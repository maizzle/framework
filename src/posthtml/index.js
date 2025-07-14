import get from 'lodash-es/get.js'
import { defu as merge } from 'defu'

// PostHTML
import posthtml from 'posthtml'
import posthtmlFetch from 'posthtml-fetch'
import envTags from './plugins/envTags.js'
import components from 'posthtml-component'
import expandLinkTag from './plugins/expandLinkTag.js'
import envAttributes from './plugins/envAttributes.js'
import { getPosthtmlOptions } from './defaultConfig.js'
import combineMediaQueries from './plugins/combineMediaQueries.js'
import defaultComponentsConfig from './defaultComponentsConfig.js'
import removeRawStyleAttributes from './plugins/removeRawStyleAttributes.js'

// PostCSS
import { compileCss } from './plugins/postcss/compileCss.js'

export async function process(html = '', config = {}) {
  /**
   * Define PostHTML options by merging user-provided ones
   * on top of a default configuration.
   */
  const posthtmlOptions = getPosthtmlOptions(get(config, 'posthtml.options', {}))

  const componentsUserOptions = get(config, 'components', {})

  const expressionsOptions = merge(
    get(config, 'expressions', get(config, 'posthtml.expressions', {})),
    get(componentsUserOptions, 'expressions', {}),
  )

  const locals = merge(
    get(config, 'locals', {}),
    get(expressionsOptions, 'locals', {}),
    { page: config },
  )

  const fetchPlugin = posthtmlFetch(
    merge(
      {
        expressions: merge(
          { locals },
          expressionsOptions,
          {
            missingLocal: '{local}',
            strictMode: false,
          },
        ),
      },
      get(config, 'fetch', {})
    )
  )

  const componentsConfig = merge(
    {
      expressions: merge(
        { locals },
        expressionsOptions,
      )
    },
    componentsUserOptions,
    defaultComponentsConfig
  )

  // Ensure `fileExtension` is array and  has no duplicates
  componentsConfig.fileExtension = Array.from(new Set(
    [].concat(componentsConfig.fileExtension)
  ))

  const beforePlugins = get(config, 'posthtml.plugins.before', [])

  return posthtml([
    ...beforePlugins,
    compileCss(config),
    fetchPlugin,
    components(componentsConfig),
    fetchPlugin,
    expandLinkTag(),
    envTags(config.env),
    envAttributes(config.env),
    compileCss(config),
    get(config, 'css.combineMediaQueries') !== false
      && combineMediaQueries(get(config, 'css.combineMediaQueries', { sort: 'mobile-first' })),
    removeRawStyleAttributes(),
    ...get(
      config,
      'posthtml.plugins.after',
      beforePlugins.length > 0
        ? []
        : get(config, 'posthtml.plugins', [])
    ),
  ].filter(Boolean))
    .process(html, posthtmlOptions)
    .then(result => ({
      config: merge(config, { page: config }),
      html: result.html,
    }))
    .catch(error => {
      throw error
    })
}

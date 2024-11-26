import get from 'lodash-es/get.js'
import { defu as merge } from 'defu'

// PostHTML
import posthtml from 'posthtml'
import posthtmlFetch from 'posthtml-fetch'
import envTags from './plugins/envTags.js'
import components from 'posthtml-component'
import posthtmlPostcss from 'posthtml-postcss'
import expandLinkTag from './plugins/expandLinkTag.js'
import envAttributes from './plugins/envAttributes.js'
import { getPosthtmlOptions } from './defaultConfig.js'

// PostCSS
import tailwindcss from 'tailwindcss'
import postcssImport from 'postcss-import'
import cssVariables from 'postcss-css-variables'
import postcssSafeParser from 'postcss-safe-parser'

import defaultComponentsConfig from './defaultComponentsConfig.js'

export async function process(html = '', config = {}) {
  const resolveCSSProps = get(config, 'css.resolveProps')

  const postcssPlugin = posthtmlPostcss(
    [
      postcssImport(),
      tailwindcss(get(config, 'css.tailwind', {})),
      resolveCSSProps !== false && cssVariables(resolveCSSProps),
      ...get(config, 'postcss.plugins', []),
    ],
    merge(
      get(config, 'postcss.options', {}),
      {
        from: config.cwd || './',
        parser: postcssSafeParser
      }
    )
  )

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

  return posthtml([
    ...get(config, 'posthtml.plugins.before', []),
    envTags(config.env),
    envAttributes(config.env),
    expandLinkTag,
    postcssPlugin,
    fetchPlugin,
    components(
      merge(
        {
          expressions: merge(
            { locals },
            expressionsOptions,
          )
        },
        componentsUserOptions,
        defaultComponentsConfig
      )
    ),
    expandLinkTag,
    postcssPlugin,
    envTags(config.env),
    envAttributes(config.env),
    ...get(config, 'posthtml.plugins.after', get(config, 'posthtml.plugins', []))
  ])
    .process(html, posthtmlOptions)
    .then(result => ({
      config: merge(config, { page: config }),
      html: result.html,
    }))
    .catch(error => {
      throw error
    })
}

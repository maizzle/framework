import get from 'lodash-es/get.js'
import { defu as merge } from 'defu'

// PostHTML
import posthtml from 'posthtml'
import components from 'posthtml-component'
import posthtmlPostcss from 'posthtml-postcss'
import defaultPosthtmlConfig from './defaultConfig.js'
import expandLinkTag from './plugins/expandLinkTag.js'
import envAttributes from './plugins/envAttributes.js'
import envTags from './plugins/envTags.js'

// PostCSS
import tailwindcss from 'tailwindcss'
import postcssImport from 'postcss-import'
import postcssSafeParser from 'postcss-safe-parser'
import customProperties from 'postcss-custom-properties'

import defaultComponentsConfig from './defaultComponentsConfig.js'

export async function process(html = '', config = {}) {
  const postcssPlugin = posthtmlPostcss(
    [
      postcssImport(),
      tailwindcss(get(config, 'css.tailwind', {})),
      get(config, 'css.inline.resolveCSSVariables', true) && customProperties(),
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

  const posthtmlOptions = merge(get(config, 'posthtml.options', {}), defaultPosthtmlConfig)

  const componentsUserOptions = get(config, 'components', {})

  const expressionsOptions = merge(
    get(config, 'build.expressions', get(config, 'posthtml.expressions', {})),
    get(componentsUserOptions, 'expressions', {}),
  )

  const locals = merge(
    get(config, 'locals', {}),
    get(expressionsOptions, 'locals', {}),
    { page: config },
  )

  return posthtml([
    ...get(config, 'posthtml.plugins.before', []),
    envTags(config.env),
    envAttributes(config.env),
    expandLinkTag,
    postcssPlugin,
    components(
      merge(
        {
          expressions: {
            locals,
          }
        },
        componentsUserOptions,
        defaultComponentsConfig
      )
    ),
    expandLinkTag,
    postcssPlugin,
    ...get(config, 'posthtml.plugins.after', get(config, 'posthtml.plugins', []))
  ])
    .process(html, posthtmlOptions)
    .then(result => ({
      config,
      html: result.html,
    }))
    .catch(error => {
      throw error
    })
}

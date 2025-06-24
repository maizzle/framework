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
import postcssCalc from 'postcss-calc'
import postcssImport from 'postcss-import'
import cssVariables from 'postcss-css-variables'
import postcssSafeParser from 'postcss-safe-parser'
import postcssColorFunctionalNotation from 'postcss-color-functional-notation'

import defaultComponentsConfig from './defaultComponentsConfig.js'

export async function process(html = '', config = {}) {
  /**
   * Configure PostCSS pipeline. Plugins defined and added here
   * will apply to all `<style>` tags in the HTML.
   */
  const resolveCSSProps = get(config, 'css.resolveProps')
  const resolveCalc = get(config, 'css.resolveCalc') !== false
    ? get(config, 'css.resolveCalc', { precision: 2 }) // it's true by default, use default precision 2
    : false

  const postcssPlugin = posthtmlPostcss(
    [
      postcssImport(),
      tailwindcss(get(config, 'css.tailwind', {})),
      resolveCSSProps !== false && cssVariables(resolveCSSProps),
      resolveCalc !== false && postcssCalc(resolveCalc),
      postcssColorFunctionalNotation(),
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
    envTags(config.env),
    envAttributes(config.env),
    expandLinkTag(),
    postcssPlugin,
    fetchPlugin,
    components(componentsConfig),
    expandLinkTag(),
    postcssPlugin,
    envTags(config.env),
    envAttributes(config.env),
    ...get(
      config,
      'posthtml.plugins.after',
      beforePlugins.length > 0
        ? []
        : get(config, 'posthtml.plugins', [])
    ),
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

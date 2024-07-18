import posthtml from 'posthtml'
import get from 'lodash-es/get.js'
import { defu as merge } from 'defu'

import comb from './comb.js'
import sixHex from './sixHex.js'
import minify from './minify.js'
import baseUrl from './baseUrl.js'
import inlineCSS from './inline.js'
import prettify from './prettify.js'
import filters from './filters/index.js'
import markdown from 'posthtml-markdownit'
import posthtmlMso from './posthtmlMso.js'
import shorthandCss from './shorthandCss.js'
import preventWidows from './preventWidows.js'
import addAttributes from './addAttributes.js'
import urlParameters from './urlParameters.js'
import safeClassNames from './safeClassNames.js'
import replaceStrings from './replaceStrings.js'
import attributeToStyle from './attributeToStyle.js'
import removeAttributes from './removeAttributes.js'

import coreTransformers from './core.js'

import defaultPosthtmlConfig from '../posthtml/defaultConfig.js'

/**
 * Use Maizzle Transformers on an HTML string.
 *
 * Only Transformers that are enabled in the `config` will be used.
 *
 * @param {string} html The HTML content
 * @param {object} config The Maizzle config object
 * @returns {Promise<{ original: string, config: object, html: string }>}
 *   A Promise resolving to an object containing the original HTML, modified HTML, and the config
 */
export async function run(html = '', config = {}) {
  const posthtmlPlugins = []

  const posthtmlConfig = merge(
    get(config, 'posthtml.options', {}),
    defaultPosthtmlConfig
  )

  /**
   * 1. Core transformers
   *
   * Transformers that are always enabled
   *
   */
  posthtmlPlugins.push(coreTransformers(config))

  /**
   * 2. Safe class names
   *
   * Rewrite Tailwind CSS class names to email-safe alternatives,
   * unless explicitly disabled
   */
  if (get(config, 'css.safe') !== false) {
    posthtmlPlugins.push(
      safeClassNames(get(config, 'css.safe', {}))
    )
  }

  /**
   * 3. Filters
   *
   * Apply filters to HTML.
   * Filters are always applied, unless explicitly disabled.
   */
  if (get(config, 'filters') !== false) {
    posthtmlPlugins.push(
      filters(get(config, 'filters', {}))
    )
  }

  /**
   * 4. Markdown
   *
   * Convert Markdown to HTML with Markdown-it, unless explicitly disabled
   */
  if (get(config, 'markdown') !== false) {
    posthtmlPlugins.push(
      markdown(get(config, 'markdown', {}))
    )
  }

  /**
   * 5. Prevent widow words
   * Always runs, unless explicitly disabled
   */
  if (get(config, 'widowWords') !== false) {
    posthtmlPlugins.push(
      preventWidows(get(config, 'widowWords', {}))
    )
  }

  /**
   * 6. Attribute to `style`
   *
   * Duplicate HTML attributes to inline CSS.
   */
  if (get(config, 'css.inline.attributeToStyle')) {
    posthtmlPlugins.push(
      attributeToStyle(get(config, 'css.inline.attributeToStyle', []))
    )
  }

  /**
   * 7. Inline CSS
   *
   * Inline CSS into HTML
   */
  if (get(config, 'css.inline')) {
    posthtmlPlugins.push(inlineCSS(
      merge(
        get(config, 'css.inline', {}),
        {
          removeInlinedSelectors: true,
        }
      )
    ))
  }

  /**
   * 8. Purge CSS
   *
   * Remove unused CSS, uglify classes etc.
   */
  if (get(config, 'css.purge')) {
    posthtmlPlugins.push(comb(config.css.purge))
  }

  /**
   * 9. Remove attributes
   *
   * Remove attributes from HTML tags
   * If `undefined`, removes empty `style` and `class` attributes
   */
  if (get(config, 'attributes.remove') !== false) {
    posthtmlPlugins.push(
      removeAttributes(
        get(config, 'attributes.remove', []),
        posthtmlConfig
      )
    )
  }

  /**
   * 10. Shorthand CSS
   *
   * Convert longhand CSS properties to shorthand in `style` attributes
   */
  if (get(config, 'css.shorthand')) {
    posthtmlPlugins.push(
      shorthandCss(get(config, 'css.shorthand', {}))
    )
  }

  /**
   * 11. Add attributes
   *
   * Add attributes to HTML tags
   */
  if (get(config, 'attributes.add') !== false) {
    posthtmlPlugins.push(
      addAttributes(get(config, 'attributes.add', {}))
    )
  }

  /**
   * 12. Base URL
   *
   * Add a base URL to relative paths
   */
  if (get(config, 'baseURL', get(config, 'baseUrl'))) {
    posthtmlPlugins.push(
      baseUrl(get(config, 'baseURL', get(config, 'baseUrl', {})))
    )
  } else {
    /**
     * Set baseURL to `build.static.destination` if it's not already set
     */
    const destination = get(config, 'build.static.destination', '')
    if (destination && !config._dev) {
      posthtmlPlugins.push(
        baseUrl({
          url: destination,
          allTags: true,
          styleTag: true,
          inlineCss: true,
        })
      )
    }
  }

  /**
   * 13. URL parameters
   *
   * Add parameters to URLs
   */
  if (get(config, 'urlParameters')) {
    posthtmlPlugins.push(
      urlParameters(get(config, 'urlParameters', {}))
    )
  }

  /**
   * 14. Six-digit HEX
   *
   * Convert three-digit HEX colors to six-digit
   * Always runs, unless explicitly disabled
   */
  if (get(config, 'css.sixHex') !== false) {
    posthtmlPlugins.push(
      sixHex()
    )
  }

  /**
   * 15. PostHTML MSO
   *
   * Simplify writing MSO conditionals for Outlook
   */
  if (get(config, 'outlook') !== false) {
    posthtmlPlugins.push(
      posthtmlMso(get(config, 'outlook', {}))
    )
  }

  /**
   * 16. Prettify
   *
   * Pretty-print HTML using js-beautify
   */
  if (get(config, 'prettify')) {
    posthtmlPlugins.push(
      prettify(get(config, 'prettify', {}))
    )
  }

  /**
   * 17. Minify
   *
   * Minify HTML using html-crush
   */
  if (get(config, 'minify')) {
    posthtmlPlugins.push(
      minify(get(config, 'minify', {}))
    )
  }

  /**
   * 18. Replace strings
   *
   * Replace strings through regular expressions
   */
  if (get(config, 'replaceStrings')) {
    posthtmlPlugins.push(
      replaceStrings(get(config, 'replaceStrings', {}))
    )
  }

  return posthtml(posthtmlPlugins)
    .process(html, posthtmlConfig)
    .then(result => ({
      html: result.html,
    }))
}

export const transformers = {
  comb,
  sixHex,
  minify,
  baseUrl,
  inlineCSS,
  prettify,
  filters,
  markdown,
  posthtmlMso,
  shorthandCss,
  preventWidows,
  addAttributes,
  urlParameters,
  safeClassNames,
  replaceStrings,
  attributeToStyle,
  removeAttributes,
}

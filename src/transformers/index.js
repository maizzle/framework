import posthtml from 'posthtml'
import get from 'lodash-es/get.js'
import { defu as merge } from 'defu'

import core from './core.js'
import purge from './purge.js'
import sixHex from './sixHex.js'
import minify from './minify.js'
import baseUrl from './baseUrl.js'
import inlineCSS from './inline.js'
import prettify from './prettify.js'
import templateTag from './template.js'
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

import { getPosthtmlOptions } from '../posthtml/defaultConfig.js'

/**
 * Use Maizzle Transformers on an HTML string.
 *
 * Only Transformers that are enabled in the passed
 * `config` parameter will be used.
 *
 * @param {string} html The HTML content
 * @param {object} config The Maizzle config object
 * @returns {Promise<{ html: string }>} A Promise resolving to an object containing the modified HTML
 */
export async function run(html = '', config = {}) {
  const posthtmlPlugins = []

  const posthtmlConfig = getPosthtmlOptions(get(config, 'posthtml.options', {}))

  /**
   * 1. Core transformers
   *
   * Transformers that are always enabled.
   *
   */
  posthtmlPlugins.push(core(config))

  /**
   * 2. Safe class names
   *
   * Rewrite Tailwind CSS class names to email-safe alternatives,
   * unless explicitly disabled.
   */
  if (get(config, 'css.safe') !== false) {
    posthtmlPlugins.push(
      safeClassNames(get(config, 'css.safe', {}))
    )
  }

  /**
   * 3. Filters
   *
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
   * Convert Markdown to HTML with markdown-it, unless explicitly disabled.
   */
  if (get(config, 'markdown') !== false) {
    posthtmlPlugins.push(
      markdown(get(config, 'markdown', {}))
    )
  }

  /**
   * 5. Prevent widow words
   *
   * Enabled by default, will prevent widow words in elements
   * wrapped with a `prevent-widows` attribute.
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
   * Inline CSS into HTML.
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
   * 8. Remove attributes
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
   * 9. Shorthand CSS
   *
   * Convert longhand CSS properties to shorthand in `style` attributes.
   */
  if (get(config, 'css.shorthand')) {
    posthtmlPlugins.push(
      shorthandCss(get(config, 'css.shorthand', {}))
    )
  }

  /**
   * 10. Add attributes
   *
   * Add attributes to HTML tags.
   */
  if (get(config, 'attributes.add') !== false) {
    posthtmlPlugins.push(
      addAttributes(get(config, 'attributes.add', {}))
    )
  }

  /**
   * 11. Base URL
   *
   * Add a base URL to relative paths.
   */
  const baseConfig = get(config, 'baseURL', get(config, 'baseUrl'))
  if (baseConfig) {
    posthtmlPlugins.push(
      baseUrl(baseConfig)
    )
  }

  /**
   * 12. URL parameters
   *
   * Add parameters to URLs.
   */
  if (get(config, 'urlParameters')) {
    posthtmlPlugins.push(
      urlParameters(get(config, 'urlParameters', {}))
    )
  }

  /**
   * 13. Six-digit HEX
   *
   * Enabled by default, converts three-digit HEX colors to six-digit.
   */
  if (get(config, 'css.sixHex') !== false) {
    posthtmlPlugins.push(
      sixHex()
    )
  }

  /**
   * 14. PostHTML MSO
   *
   * Enabled by default, simplifies writing MSO conditionals for Outlook.
   */
  if (get(config, 'outlook') !== false) {
    posthtmlPlugins.push(
      posthtmlMso(get(config, 'outlook', {}))
    )
  }

  /**
   * 15. Purge CSS
   *
   * Remove unused CSS, uglify classes etc.
   */
  if (get(config, 'css.purge')) {
    posthtmlPlugins.push(purge(config.css.purge))
  }

  /**
   * 16. <template> tags
   *
   * Replace <template> tags with their content.
   */
  posthtmlPlugins.push(templateTag())

  /**
   * 17. Replace strings
   *
   * Replace strings through regular expressions.
   */
  if (get(config, 'replaceStrings')) {
    posthtmlPlugins.push(
      replaceStrings(get(config, 'replaceStrings', {}))
    )
  }

  /**
   * 18. Prettify
   *
   * Pretty-print HTML using js-beautify.
   */
  if (get(config, 'prettify')) {
    posthtmlPlugins.push(
      prettify(get(config, 'prettify', {}))
    )
  }

  /**
   * 19. Minify
   *
   * Minify HTML using html-crush.
   */
  if (get(config, 'minify')) {
    posthtmlPlugins.push(
      minify(get(config, 'minify', {}))
    )
  }

  return posthtml(posthtmlPlugins)
    .process(html, posthtmlConfig)
    .then(result => ({
      html: result.html,
    }))
}

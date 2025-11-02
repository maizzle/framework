import juice from 'juice'
import postcss from 'postcss'
import get from 'lodash-es/get.js'
import * as cheerio from 'cheerio/slim'
import { render } from 'posthtml-render'
import isEmpty from 'lodash-es/isEmpty.js'
import safeParser from 'postcss-safe-parser'
import isObject from 'lodash-es/isObject.js'
import { parser as parse } from 'posthtml-parser'
import { useAttributeSizes } from './useAttributeSizes.js'
import { getPosthtmlOptions } from '../posthtml/defaultConfig.js'

const posthtmlPlugin = (options = {}) => tree => {
  return inline(render(tree), options).then(html => parse(html, getPosthtmlOptions()))
}

export default posthtmlPlugin

export async function inline(html = '', options = {}) {
  // Exit early if no HTML is passed
  if (typeof html !== 'string' || html === '') {
    return html
  }

  const removeStyleTags = get(options, 'removeStyleTags', false)
  const css = get(options, 'customCSS', false)

  options.removeInlinedSelectors = get(options, 'removeInlinedSelectors', true)
  options.preferUnitlessValues = get(options, 'preferUnitlessValues', true)
  options.preservedSelectors = get(options, 'safelist', [])

  juice.styleToAttribute = get(options, 'styleToAttribute', {})
  juice.applyWidthAttributes = get(options, 'applyWidthAttributes', true)
  juice.applyHeightAttributes = get(options, 'applyHeightAttributes', true)
  juice.excludedProperties.push(...get(options, 'excludedProperties', []))
  juice.widthElements = get(options, 'widthElements', ['img', 'video']).map(i => i.toUpperCase())
  juice.heightElements = get(options, 'heightElements', ['img', 'video']).map(i => i.toUpperCase())

  if (isObject(options.codeBlocks) && !isEmpty(options.codeBlocks)) {
    Object.entries(options.codeBlocks).forEach(([k, v]) => {
      juice.codeBlocks[k] = v
    })
  }

  const $ = cheerio.load(html, {
    xml: {
      decodeEntities: false,
      xmlMode: false,
    }
  })

  // Add a `data-embed` attribute to style tags that have the embed attribute
  $('style[embed]:not([data-embed])').each((_i, el) => {
    $(el).attr('data-embed', '')
  })
  $('style[data-embed]:not([embed])').each((_i, el) => {
    $(el).attr('embed', '')
  })

  /**
   * Inline the CSS
   *
   * If customCSS is passed, inline that CSS specifically
   * Otherwise, use Juice's default inlining
   */
  $.root().html(
    css
      ? juice($.html(), { extraCss: css, removeStyleTags, ...options })
      : juice($.html(), { removeStyleTags, ...options })
  )

  /**
   * Prefer attribute sizes
   *
   * Prefer HTML `width` and `height` attributes over inline CSS.
   * Useful for retina images in MSO Outlook, where CSS sizes
   * aren't respected and will render the image in its
   * natural size.
   */
  if (options.useAttributeSizes) {
    $.root().html(
      await useAttributeSizes(html, {
        width: juice.widthElements,
        height: juice.heightElements,
      })
    )
  }

  /**
   * Remove inlined selectors from the HTML
   */
  $('style:not([embed])').each((_i, el) => {
    const { root } = postcss()
      .process(
        $(el).html(),
        {
          from: undefined,
          parser: safeParser
        }
      )

    const selectors = new Set()

    root.walkRules(rule => {
      const { selector } = rule

      // Add the selector to the set as long as it's not a pseudo selector
      if (!/.+[^\\\s]::?\w+/.test(selector)) {
        selectors.add({
          name: selector,
          prop: get(rule.nodes[0], 'prop')
        })
      }
    })

    /**
     * `preferUnitlessValues` - replace unit values with `0` where possible
     */
    selectors.forEach(({ name, prop }) => {
      const elements = $(name).get()

      // If the property is excluded from inlining, skip
      if (!juice.excludedProperties.includes(prop)) {
        // Find the selector in the HTML
        elements.forEach((el) => {
          // Get a `property|value` list from the inline style attribute
          const styleAttr = $(el).attr('style')
          const inlineStyles = {}

          if (styleAttr) {
            try {
              const root = postcss.parse(`* { ${styleAttr} }`)

              root.first.each((decl) => {
                const property = decl.prop
                let value = decl.value

                if (value && options.preferUnitlessValues) {
                  value = value.replace(
                    /\b0(px|rem|em|%|vh|vw|vmin|vmax|in|cm|mm|pt|pc|ex|ch)\b/g,
                    '0'
                  )
                }

                if (property) {
                  inlineStyles[property] = value
                }
              })

              // Update the element's style attribute with the new value
              $(el).attr(
                'style',
                Object.entries(inlineStyles).map(([property, value]) => `${property}: ${value}`).join('; ')
              )
            } catch {}
          }
        })
      }
    })
  })

  $('style[embed]').each((_i, el) => {
    $(el).removeAttr('embed')
  })

  return $.html()
}

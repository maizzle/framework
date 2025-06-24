import juice from 'juice'
import postcss from 'postcss'
import get from 'lodash-es/get.js'
import has from 'lodash-es/has.js'
import * as cheerio from 'cheerio/slim'
import remove from 'lodash-es/remove.js'
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
  options.safelist = new Set([
    ...get(options, 'safelist', []),
    ...[
      '.body', // Gmail
      '.gmail', // Gmail
      '.apple', // Apple Mail
      '.ios', // Mail on iOS
      '.ox-', // Open-Xchange
      '.outlook', // Outlook.com
      '[data-ogs', // Outlook.com
      '.bloop_container', // Airmail
      '.Singleton', // Apple Mail 10
      '.unused', // Notes 8
      '.moz-text-html', // Thunderbird
      '.mail-detail-content', // Comcast, Libero webmail
      'edo', // Edison (all)
      '#msgBody', // Freenet uses #msgBody
      '.lang' // Fenced code blocks
    ],
  ])

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
      ? juice.inlineContent($.html(), css, { removeStyleTags, ...options })
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
  // For each style tag
  $('style:not([embed])').each((_i, el) => {
    // Parse the CSS
    const { root } = postcss()
      .process(
        $(el).html(),
        {
          from: undefined,
          parser: safeParser
        }
      )

    // Precompile a single regex to match any substring from the preservedClasses set
    const combinedPattern = Array.from(options.safelist)
      .map(pattern => pattern.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'))  // Escape special regex chars
      .join('|')  // Combine all patterns into a single regex pattern with 'OR' (|)

    const combinedRegex = new RegExp(combinedPattern)

    const selectors = new Set()

    // Preserve selectors in at rules
    root.walkAtRules(rule => {
      if (['media', 'supports'].includes(rule.name)) {
        rule.walkRules(rule => {
          options.safelist.add(rule.selector)
        })
      }
    })

    // For each rule in the CSS block we're parsing
    root.walkRules(rule => {
      // Create a set of selectors
      const { selector } = rule

      // Add the selector to the set as long as it's not a pseudo selector
      if (!/.+[^\\\s]::?\w+/.test(selector)) {
        selectors.add({
          name: selector,
          prop: get(rule.nodes[0], 'prop')
        })
      }
      // Preserve pseudo selectors
      else {
        options.safelist.add(selector)
      }

      if (options.removeInlinedSelectors) {
        // Remove the rule in the <style> tag as long as it's not a preserved class
        if (!options.safelist.has(selector) && !combinedRegex.test(selector)) {
          rule.remove()
        }

        // Update the <style> tag contents
        $(el).html(root.toString())
      }
    })

    /**
     * CSS optimizations
     *
     * 1. `preferUnitlessValues` - Replace unit values with `0` where possible
     * 2. `removeInlinedSelectors` - Remove inlined selectors from the HTML
     */

    // Loop over selectors that we found in the <style> tags
    selectors.forEach(({ name, prop }) => {
      const elements = $(name).get()

      // If the property is excluded from inlining, skip
      if (!juice.excludedProperties.includes(prop)) {
        // Find the selector in the HTML
        elements.forEach((el) => {
          // Get a `property|value` list from the inline style attribute
          const styleAttr = $(el).attr('style')
          const inlineStyles = {}

          // 1. `preferUnitlessValues`
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

          // Get the classes from the element's class attribute
          const classes = $(el).attr('class')

          // 2. `removeInlinedSelectors`
          if (options.removeInlinedSelectors && classes) {
            const classList = classes.split(' ')

            // If the class has been inlined in the style attribute...
            if (has(inlineStyles, prop)) {
              // Try to remove the classes that have been inlined
              if (![...options.safelist].some(item => item.includes(name))) {
                remove(classList, classToRemove => name.includes(classToRemove))
              }

              // Update the class list on the element with the new classes
              if (classList.length > 0) {
                $(el).attr('class', classList.join(' '))
              } else {
                $(el).removeAttr('class')
              }
            }
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

import juice from 'juice'
import postcss from 'postcss'
import get from 'lodash-es/get.js'
import has from 'lodash-es/has.js'
import * as cheerio from 'cheerio/slim'
import remove from 'lodash-es/remove.js'
import { render } from 'posthtml-render'
import { calc } from '@csstools/css-calc'
import isEmpty from 'lodash-es/isEmpty.js'
import safeParser from 'postcss-safe-parser'
import isObject from 'lodash-es/isObject.js'
import { parser as parse } from 'posthtml-parser'
import { parseCSSRule } from '../utils/string.js'
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

  options.resolveCSSVariables = get(options, 'resolveCSSVariables', true)
  options.removeInlinedSelectors = get(options, 'removeInlinedSelectors', true)
  options.resolveCalc = get(options, 'resolveCalc', true)
  options.preferUnitlessValues = get(options, 'preferUnitlessValues', true)

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
  $('style[embed]:not([data-embed])').each((i, el) => {
    $(el).attr('data-embed', '')
  })
  $('style[data-embed]:not([embed])').each((i, el) => {
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
  $('style:not([embed])').each((i, el) => {
    // Parse the CSS
    const { root } = postcss()
      .process(
        $(el).html(),
        {
          from: undefined,
          parser: safeParser
        }
      )

    const preservedClasses = new Set([
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
    ])

    // Precompile a single regex to match any substring from the preservedClasses set
    const combinedPattern = Array.from(preservedClasses)
      .map(pattern => pattern.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'))  // Escape special regex chars
      .join('|')  // Combine all patterns into a single regex pattern with 'OR' (|)

    const combinedRegex = new RegExp(combinedPattern)

    const selectors = new Set()

    // Preserve selectors in at rules
    root.walkAtRules(rule => {
      if (['media', 'supports'].includes(rule.name)) {
        rule.walkRules(rule => {
          preservedClasses.add(rule.selector)
        })
      }
    })

    // For each rule in the CSS block we're parsing
    root.walkRules(rule => {
      // Keep track of declarations in the rule
      const declarations = new Set()

      rule.walkDecls(decl => {
        // Resolve calc() values to static values
        if (options.resolveCalc) {
          decl.value = decl.value.includes('calc(') ? calc(decl.value, { precision: 2 }) : decl.value
        }

        declarations.add(decl)
      })

      /**
       * Remove duplicate declarations
       *
       * Only do so if the `resolveCSSVariables` option is enabled,
       * otherwise we'll end up removing all declarations that use CSS variables
       */
      if (options.resolveCSSVariables) {
        Array.from(declarations)
          /**
           * Consider only declarations with a value that includes any of the other declarations' property
           * So a decl like color(var(--text-color)) will be removed if there's a decl with a property of --text-color
           *  */
          .filter(decl =>
            Array.from(declarations).some(otherDecl => decl.value.includes(otherDecl.prop))
            || decl.prop.startsWith('--')
          )
          .map(decl => decl.remove())
      }

      const { selector } = rule

      selectors.add({
        name: selector,
        prop: get(rule.nodes[0], 'prop')
      })

      // Preserve pseudo selectors
      // TODO: revisit pseudos list
      if ([':hover', ':active', ':focus', ':visited', ':link', ':before', ':after'].some(i => selector.includes(i))) {
        preservedClasses.add(selector)
      }

      if (options.removeInlinedSelectors) {
        // Remove the rule in the <style> tag as long as it's not a preserved class
        if (!preservedClasses.has(selector) && !combinedRegex.test(selector)) {
          rule.remove()
        }

        // Update the <style> tag contents
        $(el).html(root.toString())
      }
    })

    // Loop over selectors that we found in the <style> tags
    selectors.forEach(({ name, prop }) => {
      const elements = $(name).get()

      // If the property is excluded from inlining, skip
      if (!juice.excludedProperties.includes(prop)) {
        // Find the selector in the HTML
        elements.forEach((el) => {
          // Get a `property|value` list from the inline style attribute
          const styleAttr = $(el).attr('style')
          let inlineStyles = {}

          if (styleAttr) {
            inlineStyles = styleAttr.split(';').reduce((acc, i) => {
              let { property, value } = parseCSSRule(i)

              if (value && options.resolveCalc) {
                value = value.includes('calc') ? calc(value, { precision: 2 }) : value
              }

              if (value && options.preferUnitlessValues) {
                value = value.replace(
                  /\b0(px|rem|em|%|vh|vw|vmin|vmax|in|cm|mm|pt|pc|ex|ch)\b/g,
                  '0'
                )
              }

              if (property) {
                acc[property] = value
              }

              return acc
            }, {})

            // Update the element's style attribute with the new value
            $(el).attr(
              'style',
              Object.entries(inlineStyles).map(([property, value]) => `${property}: ${value}`).join('; ')
            )
          }

          // Get the classes from the element's class attribute
          const classes = $(el).attr('class')

          if (options.removeInlinedSelectors && classes) {
            const classList = classes.split(' ')

            // If the class has been inlined in the style attribute...
            if (has(inlineStyles, prop)) {
              // Try to remove the classes that have been inlined
              if (![...preservedClasses].some(item => item.endsWith(name) || item.startsWith(name))) {
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

  $('style[embed]').each((i, el) => {
    $(el).removeAttr('embed')
  })

  return $.html()
}

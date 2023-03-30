const postcss = require('postcss')
const posthtml = require('posthtml')
const {get, merge, has, remove} = require('lodash')
const parseAttrs = require('posthtml-attrs-parser')
const matchHelper = require('posthtml-match-helper')
const defaultConfig = require('../generators/posthtml/defaultConfig')

module.exports = async (html, config = {}) => {
  if (get(config, 'removeInlinedClasses') === false) {
    return html
  }

  const options = {
    posthtml: merge(defaultConfig, get(config, 'build.posthtml.options', {})),
    removeUnusedCSS: config
  }

  return posthtml([plugin(options)]).process(html, options.posthtml).then(result => result.html)
}

const plugin = (options = {}) => tree => {
  const process = node => {
    // For each style tag...
    if (node.tag === 'style') {
      const {root} = postcss().process(node.content)
      const preservedClasses = []

      // Preserve selectors in at rules
      root.walkAtRules(rule => {
        if (['media', 'supports'].includes(rule.name)) {
          rule.walkRules(rule => {
            preservedClasses.push(rule.selector)
          })
        }
      })

      root.walkRules(rule => {
        const {selector} = rule
        const prop = get(rule.nodes[0], 'prop')

        // Preserve pseudo selectors
        if (selector.includes(':')) {
          preservedClasses.push(selector)
        }

        try {
          const safelist = get(options.removeUnusedCSS, 'whitelist', [])

          // If we find the selector in the HTML...
          tree.match(matchHelper(selector), n => {
            // If the selector is safelisted, preserve it
            if (safelist.some(item => item.endsWith(selector) || item.startsWith(selector))) {
              preservedClasses.push(selector)
              return n
            }

            const parsedAttrs = parseAttrs(n.attrs)
            const classAttr = get(parsedAttrs, 'class', [])
            const styleAttr = get(parsedAttrs, 'style', {})

            // If the class is in the style attribute (inlined), remove it
            if (has(styleAttr, prop)) {
              // Remove the class as long as it's not a preserved class
              if (!preservedClasses.some(item => item.endsWith(selector) || item.startsWith(selector))) {
                remove(classAttr, classToRemove => selector.includes(classToRemove))
              }

              // Remove the rule in the <style> tag
              if (rule.parent.type !== 'atrule') {
                rule.remove()
              }
            }

            n.attrs = parsedAttrs.compose()

            // Fix issue with .compose() automatically quoting attributes with no values
            Object.entries(n.attrs).forEach(([name, value]) => {
              if (value === '' && get(options.posthtml, 'recognizeNoValueAttribute') === true) {
                n.attrs[name] = true
              }
            })

            return n
          })
        } catch {}
      })

      node.content = root.toString().trim()

      // Remove <style> tag if it ends up empty after processing
      if (node.content.length === 0) {
        node.tag = false
      }
    }

    return node
  }

  return tree.walk(process)
}

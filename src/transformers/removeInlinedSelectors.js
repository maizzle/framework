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

  const posthtmlOptions = merge(defaultConfig, get(config, 'build.posthtml.options', {}))

  return posthtml([plugin(posthtmlOptions)]).process(html, posthtmlOptions).then(result => result.html)
}

const plugin = posthtmlOptions => tree => {
  const process = node => {
    // For each style tag...
    if (node.tag === 'style') {
      const {root} = postcss().process(node.content)

      root.walkRules(rule => {
        // Skip media queries and such...
        if (rule.parent.type === 'atrule') {
          return
        }

        const {selector} = rule
        const prop = get(rule.nodes[0], 'prop')

        try {
          // If we find the selector in the HTML...
          tree.match(matchHelper(selector), n => {
            const parsedAttrs = parseAttrs(n.attrs)
            const classAttr = get(parsedAttrs, 'class', [])
            const styleAttr = get(parsedAttrs, 'style', {})

            // If the class is in the style attribute (inlined), remove it
            if (has(styleAttr, prop)) {
              // Remove the class attribute
              remove(classAttr, s => selector.includes(s))

              // Remove the rule in the <style> tag
              rule.remove()
            }

            /**
             * Remove from <style> selectors that were used to create shorthand declarations
             * like `margin: 0 0 0 16px` (transformed with mergeLonghand when inlining).
             */
            Object.keys(styleAttr).forEach(key => {
              if (prop && prop.includes(key)) {
                rule.remove()
                remove(classAttr, s => selector.includes(s))
              }
            })

            n.attrs = parsedAttrs.compose()

            // Fix issue with .compose() automatically quoting attributes with no values
            Object.entries(n.attrs).forEach(([name, value]) => {
              if (value === '' && get(posthtmlOptions, 'recognizeNoValueAttribute') === true) {
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

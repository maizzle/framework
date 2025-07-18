import postcss from 'postcss'
import get from 'lodash-es/get.js'
import { defu as merge } from 'defu'
import postcssSafeParser from 'postcss-safe-parser'

export default (maizzleConfig => tree => {
  const process = node => {
    if (node?.tag !== 'style') {
      return node
    }

    const replacements = get(maizzleConfig, 'css.replaceProperties', {})

    const css = Array.isArray(node.content) ? node.content.join('') : node.content

    postcss([
      postcssPlugin({
        properties: replacements,
      }),
    ]).process(css, merge(
      get(maizzleConfig, 'postcss.options', {}),
      {
        from: undefined,
        parser: postcssSafeParser
      }
    )).then( result => {
      node.content = result.css
    })

    return node
  }

  return tree.walk(process)
})

const postcssPlugin = (opts = {}) => {
  opts = merge(opts, {
    properties: {
      'text-decoration-line': 'text-decoration',
    }
  })

  return {
    postcssPlugin: 'postcss-replace-properties',
    Declaration(decl) {
      if (Object.hasOwn(opts.properties, decl.prop)) {
        decl.prop = opts.properties[decl.prop]
      }
    },
  }
}

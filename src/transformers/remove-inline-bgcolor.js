const {get, isEmpty} = require('lodash')
const posthtml = require('posthtml')
const parseAttrs = require('posthtml-attrs-parser')

module.exports = async (html, config = {}, direct = false) => {
  const posthtmlOptions = get(config, 'build.posthtml.options', {})

  if (isEmpty(config)) {
    return posthtml([removeInlineBGColor()]).process(html, posthtmlOptions).then(result => result.html)
  }

  if (get(config, 'inlineCSS.preferBgColorAttribute') === true) {
    return posthtml([removeInlineBGColor()]).process(html, posthtmlOptions).then(result => result.html)
  }

  const tags = direct ? (Array.isArray(config) ? config : false) : get(config, 'inlineCSS.preferBgColorAttribute', false)

  if (Array.isArray(tags)) {
    return posthtml([removeInlineBGColor({tags})]).process(html, posthtmlOptions).then(result => result.html)
  }

  return html
}

const removeInlineBGColor = (options = {}) => tree => {
  options.tags = options.tags || ['body', 'marquee', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr']

  const process = node => {
    if (!options.tags.includes(node.tag)) {
      return node
    }

    const attrs = parseAttrs(node.attrs, {
      rules: {
        bgcolor: {
          delimiter: /\s+/,
          glue: ' '
        }
      }
    })

    if (attrs.style && attrs.style['background-color']) {
      attrs.bgcolor = attrs.style['background-color']
      delete attrs.style['background-color']
      node.attrs = attrs.compose()
    }

    return node
  }

  return tree.walk(process)
}

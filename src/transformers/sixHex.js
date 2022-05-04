const {get} = require('lodash')
const posthtml = require('posthtml')
const parseAttrs = require('posthtml-attrs-parser')
const {conv} = require('color-shorthand-hex-to-six-digit')

module.exports = async (html, config = {}) => {
  if (get(config, 'sixHex') === false) {
    return html
  }

  const posthtmlOptions = get(config, 'build.posthtml.options', {})
  return posthtml([sixHex()]).process(html, posthtmlOptions).then(result => result.html)
}

const sixHex = () => tree => {
  const process = node => {
    const attrs = parseAttrs(node.attrs)

    const targets = ['bgcolor', 'color']

    targets.forEach(attribute => {
      if (attrs[attribute]) {
        attrs[attribute] = conv(attrs[attribute])
      }
    })

    node.attrs = attrs.compose()

    return node
  }

  return tree.walk(process)
}

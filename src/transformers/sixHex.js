const {get} = require('lodash')
const posthtml = require('posthtml')
const {merge} = require('../utils/helpers')
const {conv} = require('color-shorthand-hex-to-six-digit')
const defaultConfig = require('../generators/posthtml/defaultConfig')

module.exports = async (html, config = {}) => {
  if (get(config, 'sixHex') === false) {
    return html
  }

  const posthtmlOptions = merge(defaultConfig, get(config, 'build.posthtml.options', {}))

  return posthtml([sixHex()]).process(html, posthtmlOptions).then(result => result.html)
}

const sixHex = () => tree => {
  const targets = new Set(['bgcolor', 'color'])

  const process = node => {
    if (node.attrs) {
      Object.entries(node.attrs).forEach(([name, value]) => {
        if (targets.has(name) && node.attrs[name]) {
          node.attrs[name] = conv(value)
        }
      })
    }

    return node
  }

  return tree.walk(process)
}

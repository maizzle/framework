const {get} = require('lodash')
const posthtml = require('posthtml')
const {conv} = require('color-shorthand-hex-to-six-digit')

module.exports = async (html, config = {}) => {
  if (get(config, 'sixHex') === false) {
    return html
  }

  const posthtmlOptions = get(config, 'build.posthtml.options', {})
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

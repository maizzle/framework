const posthtml = require('posthtml')

module.exports = (html, config, options = config.build.posthtml.options || {}) => {
  return posthtml([plaintext()]).process(html, { ...options, sync: true }).html
}

const plaintext = () => tree => {
  const process = node => {
    if (node.tag === 'plaintext') {
      return {
        tag: false,
        content: ['']
      }
    }

    return node
  }

  return tree.walk(process)
}

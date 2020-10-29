const posthtml = require('posthtml')
const {getPropValue} = require('../utils/helpers')

module.exports = (html, config) => {
  const posthtmlOptions = getPropValue(config, 'build.posthtml.options') || {decodeEntities: false}

  return posthtml([plaintext()]).process(html, {...posthtmlOptions, sync: true}).html
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

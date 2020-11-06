const {get} = require('lodash')
const posthtml = require('posthtml')

module.exports = (html, config) => {
  const posthtmlOptions = get(config, 'build.posthtml.options', {})

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

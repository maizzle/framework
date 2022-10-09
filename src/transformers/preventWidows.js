const posthtml = require('posthtml')
const {get, isEmpty} = require('lodash')
const {removeWidows} = require('string-remove-widows')

module.exports = async (html, config = {}) => {
  if (isEmpty(config)) {
    return removeWidows(html).res
  }

  const options = get(config, 'attrName', 'prevent-widows')
  const posthtmlOptions = get(config, 'build.posthtml.options', {recognizeNoValueAttribute: true})

  return posthtml([removeWidowsPlugin(options)]).process(html, posthtmlOptions).then(result => result.html)
}

const removeWidowsPlugin = attrName => tree => {
  const process = node => {
    if (node.attrs && node.attrs[attrName]) {
      const widowsRemovedString = removeWidows(tree.render(node.content)).res

      node.content = tree.render(tree.parser(widowsRemovedString))
      node.attrs[attrName] = false
    }

    return node
  }

  return tree.walk(process)
}

import { validAttributeNames } from './postcss/compileCss.js'

const plugin = () => tree => {
  const process = node => {
    if (node.tag === 'style') {
      if (node.attrs && Object.keys(node.attrs).some(attr => validAttributeNames.has(attr))) {
        // Remove the attribute
        for (const attr of Object.keys(node.attrs)) {
          if (validAttributeNames.has(attr)) {
            delete node.attrs[attr]
          }
        }
      }
    }

    return node
  }

  return tree.walk(process)
}

export default plugin

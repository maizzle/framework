import postcss from 'postcss'
import posthtml from 'posthtml'
import get from 'lodash-es/get.js'

const posthtmlPlugin = (mappings = {}) => tree => {
  if (!Object.keys(mappings).length) {
    return tree
  }

  // Normalize tags in mappings by lowercasing them
  for (const key in mappings) {
    if (Array.isArray(mappings[key])) {
      mappings[key] = mappings[key].map(value => value.toLowerCase())
    }
  }

  const process = node => {
    // Check if the node is defined in mappings
    if (
      get(mappings, 'width', []).includes(node.tag)
      || get(mappings, 'height', []).includes(node.tag)
    ) {
      // Check if the node has an inline CSS property equal to one of the keys in mappings
      if (node.attrs.style) {
        const { root } = postcss().process(`${node.attrs.style}`, { from: undefined })

        root.walkDecls(decl => {
          if (mappings.width.includes(node.tag) && decl.prop === 'width') {
            // Set its value as an attribute on the node; the attribute name is the key in mappings
            node.attrs.width = decl.value.replace('px', '')
            // Remove the inline CSS property from the declaration
            decl.remove()
          }

          if (mappings.height.includes(node.tag) && decl.prop === 'height') {
            // Set its value as an attribute on the node; the attribute name is the key in mappings
            node.attrs.height = decl.value.replace('px', '')
            // Remove the inline CSS property from the declaration
            decl.remove()
          }
        })

        // Set the remaining inline CSS as the `style` attribute on the node
        // If there are no remaining declarations, remove the `style` attribute
        node.attrs.style = root.toString().trim() || false
      }
    }

    return node
  }

  return tree.walk(process)
}

export default posthtmlPlugin

export async function useAttributeSizes(html = '', mappings = {}, posthtmlOptions = {}) {
  return posthtml([
    posthtmlPlugin(mappings)
  ])
    .process(html, posthtmlOptions)
    .then(result => result.html)
}

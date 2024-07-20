const posthtmlPlugin = (() => tree => {
  const process = node => {
    // Return the original node if it doesn't have a tag
    if (!node.tag) {
      return node
    }

    // Preserve <template> tags marked as such
    if (node.tag === 'template' && node.attrs?.preserve) {
      node.attrs.preserve = false

      return node
    }

    // Replace <template> tags with their content
    if (node.tag === 'template') {
      node.tag = false
    }

    return node
  }

  return tree.walk(process)
})

export default posthtmlPlugin

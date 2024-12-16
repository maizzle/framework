const posthtmlPlugin = () => tree => {
  const process = node => {
    // Return the original node if it doesn't have a tag
    if (!node.tag) {
      return node
    }

    if (node.tag === 'template') {
      // Preserve <template> tags marked as such
      if ('attrs' in node && 'preserve' in node.attrs) {
        node.attrs.preserve = false

        return node
      }

      // Remove the <template> tag
      node.tag = false
    }

    return node
  }

  return tree.walk(process)
}

export default posthtmlPlugin

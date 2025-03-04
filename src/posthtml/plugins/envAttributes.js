const plugin = (env => tree => {
  const process = node => {
    // Return the original node if no environment is set
    if (!env) {
      return node
    }

    if (node?.attrs) {
      for (const attr in node.attrs) {
        const suffix = `-${env}`

        // Find attributes on this node that have this suffix
        if (attr.endsWith(suffix)) {
          const key = attr.slice(0, -suffix.length)
          const value = node.attrs[attr]

          // Change the attribute without the suffix to have the value of the suffixed attribute
          node.attrs[key] = value

          // Remove the attribute with the suffix
          node.attrs[attr] = false
        }
      }
    }

    return node
  }

  return tree.walk(process)
})

export default plugin

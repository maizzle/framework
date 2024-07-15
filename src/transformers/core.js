const posthtmlPlugin = (config = {}) => tree => {
  const process = node => {
    /**
     * Remove plaintext tags when developing locally
     */
    if (
      config._dev
      && node.tag === 'plaintext'
    ) {
      node.tag = false
      node.content = ['']
    }

    return node
  }

  return tree.walk(process)
}

export default posthtmlPlugin

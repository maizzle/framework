const plugin = (env => tree => {
  const process = node => {
    env = env || 'local'

    // Return the original node if it doesn't have a tag
    if (!node?.tag) {
      return node
    }

    // Handle <env:?> tags (render only if current env matches)
    if (
      typeof node.tag === 'string'
      && node.tag.startsWith('env:')
    ) {
      const tagEnv = node.tag.slice(4) // Remove 'env:' prefix

      if (tagEnv === '' || tagEnv !== env) {
        // No env specified or tag doesn't target current env, remove everything
        node.content = []
        node.tag = false
      } else {
        // Tag targets current env, remove tag and keep content
        node.tag = false
      }
    }

    // Handle <not-env:?> tags (render only if current env does not match)
    if (
      typeof node.tag === 'string'
      && node.tag.startsWith('not-env:')
    ) {
      const tagEnv = node.tag.slice(8) // Remove 'not-env:' prefix

      if (tagEnv === '' || tagEnv === env) {
        // No env specified or tag targets current env, remove everything
        node.content = []
        node.tag = false
      } else {
        // Tag doesn't target current env, remove tag and keep content
        node.tag = false
      }
    }

    return node
  }

  return tree.walk(process)
})

export default plugin

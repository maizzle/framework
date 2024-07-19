const plugin = (env => tree => {
  const process = node => {
    env = env || 'local'

    // Return the original node if it doesn't have a tag
    if (!node.tag) {
      return node
    }

    const tagEnv = node.tag.split(':').pop()

    // Tag targets current env, remove it and return its content
    if (node.tag.endsWith(`:${env}`)) {
      node.tag = false
    }

    // Tag doesn't target current env, remove it completely
    if (
      typeof node.tag === 'string'
      && node.tag.startsWith('env:')
      && tagEnv !== env
    ) {
      node.content = []
      node.tag = false
    }

    return node
  }

  return tree.walk(process)
})

export default plugin

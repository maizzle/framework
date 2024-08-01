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

    /**
     * Custom attributes to prevent inlining CSS from <style> tags
     */
    if (
      node.tag === 'style'
      && (node.attrs?.['no-inline'] || node.attrs?.embed)
    ) {
      node.attrs['no-inline'] = false
      node.attrs.embed = false
      node.attrs['data-embed'] = true
    }

    return node
  }

  return tree.walk(process)
}

export default posthtmlPlugin

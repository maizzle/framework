import fs from 'node:fs'

const targets = new Set(['expand', 'inline'])

// TODO: refactor to a Promise so we can use async readFile
const plugin = (() => tree => {
  const process = node => {
    /**
     * Don't expand link tags that are not explicitly marked as such
     */
    if (node.attrs && ![...targets].some(attr => attr in node.attrs)) {
      for (const attr of targets) {
        node.attrs[attr] = false
      }

      return node
    }

    if (
      node.tag === 'link'
      && node.attrs
      && node.attrs.href
      && node.attrs.rel === 'stylesheet'
    ) {
      node.content = [fs.readFileSync(node.attrs.href, 'utf8')]
      node.tag = 'style'
      node.attrs = {}
    }

    return node
  }

  return tree.walk(process)
})()

export default plugin

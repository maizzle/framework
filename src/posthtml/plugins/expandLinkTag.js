const targets = new Set(['expand', 'inline'])

const expandLinkPlugin = () => tree => {
  return new Promise((resolve, reject) => {
    const isNode = process?.versions?.node

    const loadFile = async href => {
      if (isNode) {
        const { readFile } = await import('node:fs/promises')
        return await readFile(href, 'utf8')
      }

      const res = await fetch(href)

      if (!res.ok) {
        throw new Error(`Failed to fetch ${href}: ${res.statusText}`)
      }

      return await res.text()
    }

    const promises = []

    try {
      tree.walk(node => {
        if (node?.attrs && ![...targets].some(attr => attr in node.attrs)) {
          for (const attr of targets) {
            node.attrs[attr] = false
          }
          return node
        }

        if (
          node?.tag === 'link' &&
          node.attrs?.href &&
          node.attrs.rel === 'stylesheet'
        ) {
          const promise = loadFile(node.attrs.href).then(content => {
            node.tag = 'style'
            node.attrs = {}
            node.content = [content]
          })

          promises.push(promise)
        }

        return node
      })

      Promise.all(promises)
        .then(() => resolve(tree))
        .catch(reject)
    } catch (err) {
      reject(err)
    }
  })
}

export default expandLinkPlugin

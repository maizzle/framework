import posthtml from 'posthtml'
import { defu as merge } from 'defu'
import { conv } from 'color-shorthand-hex-to-six-digit'
import posthtmlConfig from '../posthtml/defaultConfig.js'

const posthtmlPlugin = () => tree => {
  const targets = new Set(['bgcolor', 'color'])

  const process = node => {
    if (node.attrs) {
      Object.entries(node.attrs).forEach(([name, value]) => {
        if (targets.has(name) && node.attrs[name]) {
          node.attrs[name] = conv(value)
        }
      })
    }

    return node
  }

  return tree.walk(process)
}

export default posthtmlPlugin

export async function sixHEX(html = '', posthtmlOptions = {}) {
  return posthtml([
    posthtmlPlugin()
  ])
    .process(html, merge(posthtmlOptions, posthtmlConfig))
    .then(result => result.html)
}

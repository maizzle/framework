import posthtml from 'posthtml'
import { defu as merge } from 'defu'
import posthtmlConfig from '../posthtml/defaultConfig.js'
import addAttributesPlugin from 'posthtml-extra-attributes'

export default function posthtmlPlugin(attributes = {}) {
  const defaultAttributes = {
    table: {
      cellpadding: 0,
      cellspacing: 0,
      role: 'none'
    },
    img: {
      alt: true,
    }
  }

  // User-defined attributes take precedence
  attributes = merge(attributes, defaultAttributes)

  return addAttributesPlugin({ attributes })
}

export async function addAttributes(html = '', attributes = {}, posthtmlOptions = {}) {
  return posthtml([
    posthtmlPlugin(attributes)
  ])
    .process(html, merge(posthtmlOptions, posthtmlConfig))
    .then(result => result.html)
}

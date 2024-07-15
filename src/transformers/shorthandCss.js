import posthtml from 'posthtml'
import { defu as merge } from 'defu'
import posthtmlConfig from '../posthtml/defaultConfig.js'
import posthtmlMergeLonghand from 'posthtml-postcss-merge-longhand'

export default function posthtmlPlugin(options = {}) {
  if (Array.isArray(options.tags)) {
    return posthtmlMergeLonghand({
      tags: options.tags,
    })
  }

  return posthtmlMergeLonghand()
}

export async function shorthandCSS(html = '', options = {}, posthtmlOptions = {}) {
  return posthtml([
    posthtmlPlugin(options)
  ])
    .process(html, merge(posthtmlOptions, posthtmlConfig))
    .then(result => result.html)
}

import posthtml from 'posthtml'
import { defu as merge } from 'defu'
import posthtmlMso from 'posthtml-mso'
import posthtmlConfig from '../posthtml/defaultConfig.js'

export default function posthtmlPlugin(options = {}) {
  return posthtmlMso(options)
}

export async function useMso(html = '', options = {}, posthtmlOptions = {}) {
  return posthtml([
    posthtmlPlugin(options)
  ])
    .process(html, merge(posthtmlOptions, posthtmlConfig))
    .then(result => result.html)
}

import posthtml from 'posthtml'
import posthtmlMso from 'posthtml-mso'
import { getPosthtmlOptions } from '../posthtml/defaultConfig.js'

export default function posthtmlPlugin(options = {}) {
  return posthtmlMso(options)
}

export async function useMso(html = '', options = {}, posthtmlOptions = {}) {
  return posthtml([
    posthtmlPlugin(options)
  ])
    .process(html, getPosthtmlOptions(posthtmlOptions))
    .then(result => result.html)
}

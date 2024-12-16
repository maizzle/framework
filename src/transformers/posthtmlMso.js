import posthtml from 'posthtml'
import posthtmlMso from 'posthtml-mso'

export default function posthtmlPlugin(options = {}) {
  return posthtmlMso(options)
}

export async function useMso(html = '', options = {}, posthtmlOptions = {}) {
  return posthtml([
    posthtmlPlugin(options)
  ])
    .process(html, posthtmlOptions)
    .then(result => result.html)
}

import posthtml from 'posthtml'
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
    .process(html, posthtmlOptions)
    .then(result => result.html)
}

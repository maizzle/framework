import posthtml from 'posthtml'
import { defu as merge } from 'defu'
import posthtmlSafeClassNames from 'posthtml-safe-class-names'

export default function posthtmlPlugin(options = {}) {
  // If options is boolean, convert to object
  if (typeof options === 'boolean') {
    options = {}
  }

  // Default options
  options = merge({
    replacements: {
      '{': '{',
      '}': '}'
    }
  }, options)

  return posthtmlSafeClassNames(options)
}

export async function safeClassNames(html = '', options = {}, posthtmlOptions = {}) {
  return posthtml([
    posthtmlPlugin(options)
  ])
    .process(html, posthtmlOptions)
    .then(result => result.html)
}

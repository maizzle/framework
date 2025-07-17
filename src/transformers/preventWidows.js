import posthtml from 'posthtml'
import { defu as merge } from 'defu'
import posthtmlWidows from 'posthtml-widows'
import { getPosthtmlOptions } from '../posthtml/defaultConfig.js'

export default function posthtmlPlugin(options = {}) {
  options = merge(options, {
    minWords: 3
  })

  // Custom ignores
  const mappings = [
    // MSO comments
    {
      start: '<!--[',
      end: ']>'
    },
    // <![endif]-->
    {
      start: '<![',
      end: ']--><'
    }
  ]

  if (Array.isArray(options.ignore)) {
    options.ignore = options.ignore.concat(mappings)
  }

  return posthtmlWidows(options)
}

export async function preventWidows(html = '', options = {}, posthtmlOptions = {}) {
  return posthtml([
    posthtmlPlugin(options)
  ])
    .process(html, getPosthtmlOptions(posthtmlOptions))
    .then(result => result.html)
}

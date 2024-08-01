import posthtml from 'posthtml'
import get from 'lodash-es/get.js'
import { defu as merge } from 'defu'
import urlParameters from 'posthtml-url-parameters'
import posthtmlConfig from '../posthtml/defaultConfig.js'

export default function posthtmlPlugin(options = {}) {
  const { _options, ...parameters } = options
  const tags = get(_options, 'tags', ['a'])
  const strict = get(_options, 'strict', true)
  const qs = get(_options, 'qs', { encode: false })

  return urlParameters({ parameters, tags, qs, strict })
}

export async function addURLParams(html = '', options = {}, posthtmlOptions = {}) {
  return posthtml([
    posthtmlPlugin(options)
  ])
    .process(html, merge(posthtmlOptions, posthtmlConfig))
    .then(result => result.html)
}

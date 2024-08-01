import posthtml from 'posthtml'
import { defu as merge } from 'defu'
import posthtmlContent from 'posthtml-content'
import posthtmlConfig from '../../posthtml/defaultConfig.js'
import { filters as defaultFilters } from './defaultFilters.js'

export default function posthtmlPlugin(filters = {}) {
  filters = merge(defaultFilters, filters)

  return posthtmlContent(filters)
}

export async function filters(html = '', filters = {}, posthtmlOptions = {}) {
  return posthtml([
    posthtmlPlugin(filters)
  ])
    .process(html, merge(posthtmlOptions, posthtmlConfig))
    .then(result => result.html)
}

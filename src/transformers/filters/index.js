import posthtml from 'posthtml'
import { defu as merge } from 'defu'
import posthtmlContent from 'posthtml-content'
import { filters as defaultFilters } from './defaultFilters.js'
import { getPosthtmlOptions } from '../../posthtml/defaultConfig.js'

export default function posthtmlPlugin(filters = {}) {
  filters = merge(defaultFilters, filters)

  return posthtmlContent(filters)
}

export async function filters(html = '', filters = {}, posthtmlOptions = {}) {
  return posthtml([
    posthtmlPlugin(filters)
  ])
    .process(html, getPosthtmlOptions(posthtmlOptions))
    .then(result => result.html)
}

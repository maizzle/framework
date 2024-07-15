import posthtml from 'posthtml'
import { crush } from 'html-crush'
import { defu as merge } from 'defu'
import { render } from 'posthtml-render'
import { parser as parse } from 'posthtml-parser'
import posthtmlConfig from '../posthtml/defaultConfig.js'

const posthtmlPlugin = (options = {}) => tree => {
  options = merge(options, {
    removeLineBreaks: true,
  })

  const { result: html } = crush(render(tree), options)

  return parse(html)
}

export default posthtmlPlugin

export async function minify(html = '', options = {}, posthtmlOptions = {}) {
  return posthtml([
    posthtmlPlugin(options)
  ])
    .process(html, merge(posthtmlOptions, posthtmlConfig))
    .then(result => result.html)
}

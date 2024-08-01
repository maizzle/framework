import posthtml from 'posthtml'
import { defu as merge } from 'defu'
import md from 'posthtml-markdownit'
import posthtmlConfig from '../posthtml/defaultConfig.js'

export async function markdown(html = '', options = {}, posthtmlOptions = {}) {
  /**
   * Automatically wrap in <md> tag, unless manual mode is enabled
   * With manual mode, user must wrap the markdown content in a <md> tag
   * https://github.com/posthtml/posthtml-markdownit#usage
   */
  html = options.manual ? html : `<md>${html}</md>`

  return posthtml([
    md(options)
  ])
    .process(html, merge(posthtmlOptions, posthtmlConfig))
    .then(result => result.html)
}

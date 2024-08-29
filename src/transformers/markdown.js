import posthtml from 'posthtml'
import { defu as merge } from 'defu'
import md from 'posthtml-markdownit'
import posthtmlConfig from '../posthtml/defaultConfig.js'

export async function markdown(input = '', options = {}, posthtmlOptions = {}) {
  /**
   * If no input is provided, return an empty string.
   */
  if (!input) {
    return ''
  }

  /**
   * Automatically wrap in <md> tag, unless manual mode is enabled.
   *
   * With manual mode, user must wrap the input in a <md> tag.
   *
   * https://github.com/posthtml/posthtml-markdownit#usage
   */
  input = options.manual ? input : `<md>${input}</md>`

  return posthtml([
    md(options)
  ])
    .process(input, merge(posthtmlOptions, posthtmlConfig))
    .then(result => result.html)
}

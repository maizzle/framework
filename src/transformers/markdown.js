import posthtml from 'posthtml'
import markdownIt from 'posthtml-markdownit'
import { getPosthtmlOptions } from '../posthtml/defaultConfig.js'

/**
 * Markdown transformer for PostHTML.
 *
 * Exported only for the Maizzle API - internally we use `posthtml-markdownit` directly.
 *
 * @param {String} input Markdown input string
 * @param {Object} options Options for `posthtml-markdownit`
 * @param {Object} posthtmlOptions PostHTML options
 * @returns {Promise<string>} Processed HTML string
 */
export async function markdown(input = '', options = {}, posthtmlOptions = {}) {
  /**
   * If no input is provided, return an empty string.
   */
  if (!input) {
    return ''
  }

  /**
   * Automatically wrap in <md> tag, unless `manual` mode is enabled.
   * In `manual` mode, user must wrap the input in a <md> tag.
   *
   * https://github.com/posthtml/posthtml-markdownit#usage
   */
  input = options.manual ? input : `<md>${input}</md>`

  return posthtml([
    markdownIt(options)
  ])
    .process(input, getPosthtmlOptions(posthtmlOptions))
    .then(result => result.html)
}

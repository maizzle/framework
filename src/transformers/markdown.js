import posthtml from 'posthtml'
import md from 'posthtml-markdownit'

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
    .process(input, posthtmlOptions)
    .then(result => result.html)
}

const path = require('path')
const posthtml = require('posthtml')
const posthtmlContent = require('posthtml-content')
const Tailwind = require('../generators/tailwindcss')
const {requireUncached} = require('../utils/helpers')
const {get, isObject, isEmpty, merge, omit} = require('lodash')

module.exports = async (html, config = {}, direct = false) => {
  const replacements = direct ? config : get(config, 'transform', {})
  const posthtmlOptions = get(config, 'build.posthtml.options', {})

  /**
   * Compile CSS in <style postcss> tags with PostCSS and Tailwind CSS
   */
  const maizzleConfig = omit(config, ['build.tailwind.css', 'css'])
  const tailwindConfig = get(config, 'build.tailwind.config', 'tailwind.config.js')
  let tailwindObject = (isObject(tailwindConfig) && !isEmpty(tailwindConfig)) ? tailwindConfig : requireUncached(path.resolve(process.cwd(), tailwindConfig))
  // Use JIT by default, for faster compilation
  tailwindObject = merge(tailwindObject, {mode: 'jit'})

  replacements.postcss = css => Tailwind.compile(
    `@tailwind components; @tailwind utilities; ${css}`,
    html,
    tailwindObject,
    maizzleConfig
  )

  return posthtml([posthtmlContent(replacements)]).process(html, posthtmlOptions).then(result => result.html)
}

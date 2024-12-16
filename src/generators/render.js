import { parse } from 'pathe'
import posthtml from 'posthtml'
import { cwd } from 'node:process'
import { defu as merge } from 'defu'
import expressions from 'posthtml-expressions'
import { parseFrontMatter } from '../utils/node.js'
import { getPosthtmlOptions } from '../posthtml/defaultConfig.js'
import { process as compilePostHTML } from '../posthtml/index.js'
import { run as useTransformers } from '../transformers/index.js'

export async function render(html = '', config = {}) {
  if (typeof html !== 'string') {
    throw new TypeError(`first argument must be a string, received ${html}`)
  }

  if (html.length === 0) {
    throw new RangeError('received empty string')
  }

  /**
   * Parse front matter
   *
   * Parse expressions in front matter and add to config
   * This could be handled by components() but plugins aren't working with it currently
   */
  let { content, matter } = parseFrontMatter(html)

  /**
    * Compute template config
    *
    * Merge it with front matter data and set the `cwd` for Tailwind.
    */
  const { data: matterData } = await posthtml(
    [
      expressions({
        strictMode: false,
        missingLocal: '{local}',
        locals: {
          page: config
        }
      })
    ]
  )
    .process(matter, getPosthtmlOptions())
    .then(({ html }) => parseFrontMatter(`---${html}\n---`))

  const templateConfig = merge(matterData, config)

  /**
   * Used for PostCSS `from` to make `@config` work in Tailwind
   *
   * @todo use only when in Node environment
   */
  templateConfig.cwd = parse(cwd()).base

  /**
   * Run `beforeRender` event
   *
   * @param {Object} options
   * @param {string} options.html - The HTML to be transformed
   * @param {Object} options.matter - The front matter data
   * @param {Object} options.config - The current template config
   * @returns {string} - The transformed HTML, or the original one if nothing was returned
   */
  if (typeof templateConfig.beforeRender === 'function') {
    content = await templateConfig.beforeRender(({
      html: content,
      matter: matterData,
      config: templateConfig,
    })) ?? content
  }

  /**
   * Compile PostHTML
   */
  const compiled = await compilePostHTML(content, templateConfig)

  /**
   * Run `afterRender` event
   *
   * @param {Object} options
   * @param {string} options.html - The HTML to be transformed
   * @param {Object} options.matter - The front matter data
   * @param {Object} options.config - The current template config
   * @returns {string} - The transformed HTML, or the original one if nothing was returned
   */
  if (typeof templateConfig.afterRender === 'function') {
    compiled.html = await templateConfig.afterRender(({
      html: compiled.html,
      matter: matterData,
      config: compiled.config,
    })) ?? compiled.html
  }

  /**
   * Run Transformers
   *
   * Runs only if `useTransformers` is not explicitly disabled in the config.
   *
   * @param {string} html - The HTML to be transformed
   * @param {Object} config - The current template config
   * @returns {string} - The transformed HTML
   */
  if (templateConfig.useTransformers !== false) {
    compiled.html = await useTransformers(compiled.html, compiled.config).then(({ html }) => html)
  }

  /**
   * Run `afterTransformers` event
   *
   * @param {Object} options
   * @param {string} options.html - The HTML to be transformed
   * @param {Object} options.matter - The front matter data
   * @param {Object} options.config - The current template config
   * @returns {string} - The transformed HTML, or the original one if nothing was returned
   */
  if (typeof templateConfig.afterTransformers === 'function') {
    compiled.html = await templateConfig.afterTransformers(({
      html: compiled.html,
      matter: matterData,
      config: compiled.config,
    })) ?? compiled.html
  }

  return {
    config: compiled.config,
    html: compiled.html,
  }
}

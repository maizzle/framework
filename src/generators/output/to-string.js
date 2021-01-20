const fm = require('front-matter')
const {get, merge} = require('lodash')
const posthtml = require('../posthtml')
const Tailwind = require('../tailwindcss')
const Transformers = require('../../transformers')
const posthtmlMSO = require('../../transformers/posthtml-mso')

module.exports = async (html, options) => {
  process.env.NODE_ENV = get(options, 'maizzle.env', 'local')

  if (typeof html !== 'string') {
    throw new TypeError(`first argument must be an HTML string, received ${html}`)
  }

  if (html.length === 0) {
    throw new RangeError('received empty string')
  }

  let config = get(options, 'maizzle', {})

  const tailwindConfig = get(options, 'tailwind.config', {})
  const cssString = get(options, 'tailwind.css', '@tailwind components; @tailwind utilities;')

  const frontmatter = await posthtml(fm(html).frontmatter, config)

  html = `---\n${frontmatter}\n---\n\n${fm(html).body}`

  config = merge({applyTransformers: true}, config, fm(html).attributes)

  if (typeof get(options, 'tailwind.compiled') === 'string') {
    config.css = options.tailwind.compiled
  } else {
    config.css = await Tailwind.compile(cssString, html, tailwindConfig, config)
  }

  if (options && typeof options.beforeRender === 'function') {
    html = await options.beforeRender(html, config)
  }

  html = await posthtml(html, config)

  while (Object.keys(fm(html).attributes).length > 0) {
    html = fm(html).body
  }

  if (options && typeof options.afterRender === 'function') {
    html = await options.afterRender(html, config)
  }

  if (config.applyTransformers) {
    html = await Transformers.process(html, config)
  }

  if (options && typeof options.afterTransformers === 'function') {
    html = await options.afterTransformers(html, config)
  }

  html = await posthtmlMSO(html, config)

  return {
    html,
    config
  }
}

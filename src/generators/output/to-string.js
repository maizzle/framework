const fm = require('front-matter')
const deepmerge = require('deepmerge')
const Tailwind = require('../tailwind')
const posthtml = require('../posthtml')
const Transformers = require('../../transformers')
const {getPropValue} = require('../../utils/helpers')

module.exports = async (html, options) => {
  process.env.NODE_ENV = getPropValue(options, 'maizzle.env') || 'local'

  if (typeof html !== 'string') {
    throw new TypeError(`first argument must be an HTML string, received ${html}`)
  }

  if (html.length === 0) {
    throw new RangeError('received empty string')
  }

  let config = getPropValue(options, 'maizzle') || {}
  const tailwindConfig = getPropValue(options, 'tailwind.config') || {}
  const cssString = getPropValue(options, 'tailwind.css') || '@tailwind components; @tailwind utilities;'

  const frontMatter = fm(html)
  html = frontMatter.body
  config = deepmerge(config, frontMatter.attributes)

  if (typeof getPropValue(options, 'tailwind.compiled') === 'string') {
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

  html = await Transformers.process(html, config)

  if (options && typeof options.afterTransformers === 'function') {
    html = await options.afterTransformers(html, config)
  }

  return {
    html,
    config
  }
}

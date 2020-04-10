const fm = require('front-matter')
const deepmerge = require('deepmerge')
const Tailwind = require('../tailwind')
const posthtml = require('../posthtml')
const Transformers = require('../../transformers')
const { getPropValue } = require('../../utils/helpers')

module.exports = async (html, options) => {
  try {
    if (typeof html !== 'string') {
      throw TypeError(`first argument must be an HTML string, received ${html}`)
    }

    if (html.length < 1) {
      throw RangeError('received empty string')
    }

    let config = getPropValue(options, 'maizzle.config') || {}
    const tailwindConfig = getPropValue(options, 'tailwind.config') || {}
    const cssString = getPropValue(options, 'tailwind.css') || '@tailwind components; @tailwind utilities;'

    if (!config.isMerged) {
      const frontMatter = fm(html)
      html = frontMatter.body
      config = deepmerge(config, frontMatter.attributes)
    }

    if (!getPropValue(options, 'tailwind.compiled')) {
      config.css = await Tailwind.fromString(cssString, html, tailwindConfig, config).catch(error => { console.log(error); process.exit(1) })
    } else {
      config.css = options.tailwind.compiled
    }

    if (options && typeof options.beforeRender === 'function') {
      await options.beforeRender(config)
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

    return html
  } catch (error) {
    throw error
  }
}

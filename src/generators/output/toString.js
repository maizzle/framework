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

    // let config = options && options.maizzle && typeof options.maizzle.config === 'object' ? options.maizzle.config : null
    let config = getPropValue(options, 'maizzle.config') || {}
    // const tailwindConfig = options && options.tailwind && typeof options.tailwind.config === 'object' ? options.tailwind.config : null
    const tailwindConfig = getPropValue(options, 'tailwind.config') || {}
    const css = options && options.tailwind && typeof options.tailwind.css === 'string' ? options.tailwind.css : '@tailwind components; @tailwind utilities;'

    // if (!config) {
    //   throw TypeError(`received invalid Maizzle config: ${config}`)
    // }

    if (!config.isMerged) {
      const frontMatter = fm(html)
      html = frontMatter.body
      config = deepmerge(config, frontMatter.attributes)
    }

    config.css = options.tailwind && options.tailwind.compiled ? options.tailwind.compiled : null

    if (!config.css) {
      // if (!tailwindConfig) {
      //   throw TypeError(`received invalid Tailwind CSS config: ${tailwindConfig}`)
      // }

      config.css = await Tailwind.fromString(css, html, tailwindConfig, config).catch(err => { console.log(err); process.exit() })
    }

    if (typeof options.beforeRender === 'function') {
      await options.beforeRender(config)
    }

    html = await posthtml(html, config)

    while (Object.keys(fm(html).attributes).length > 0) {
      html = fm(html).body
    }

    if (typeof options.afterRender === 'function') {
      html = await options.afterRender(html, config)
    }

    html = await Transformers.process(html, config)

    if (typeof options.afterTransformers === 'function') {
      html = await options.afterTransformers(html, config)
    }

    return html
  } catch (error) {
    throw error
  }
}

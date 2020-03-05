const fm = require('front-matter')
const deepmerge = require('deepmerge')
const Tailwind = require('../tailwind')
const Transformers = require('../../transformers')
const NunjucksEnvironment = require('../../nunjucks')

module.exports = async (str, options) => {
  try {
    if (str && str.length < 1) {
      throw RangeError('received empty string')
    }

    if (typeof str !== 'string') {
      throw TypeError(`first argument must be a string, received ${str}`)
    }

    const css = options && options.tailwind && typeof options.tailwind.css === 'string' ? options.tailwind.css : '@tailwind components; @tailwind utilities;'
    const tailwindConfig = options && options.tailwind && typeof options.tailwind.config === 'object' ? options.tailwind.config : null
    const maizzleConfig = options && options.maizzle && typeof options.maizzle.config === 'object' ? options.maizzle.config : null

    if (!maizzleConfig) {
      throw TypeError(`received invalid Maizzle config: ${maizzleConfig}`)
    }

    const frontMatter = fm(str)
    let html = frontMatter.body

    const config = maizzleConfig.isMerged ? maizzleConfig : deepmerge(maizzleConfig, frontMatter.attributes)

    if (typeof options.afterConfig === 'function') {
      await options.afterConfig(config)
    }

    let compiledCSS = options.tailwind.compiled || null

    if (!compiledCSS) {
      if (!tailwindConfig) {
        throw TypeError(`received invalid Tailwind CSS config: ${tailwindConfig}`)
      }

      compiledCSS = await Tailwind.fromString(css, html, tailwindConfig, maizzleConfig).catch(err => { console.log(err); process.exit() })
    }

    const nunjucks = await NunjucksEnvironment.init(config.build.nunjucks)

    if (typeof options.beforeRender === 'function') {
      await options.beforeRender(nunjucks, config)
    }

    html = nunjucks.renderString(html, { page: config, env: options.env, css: compiledCSS })

    if (typeof options.afterRender === 'function') {
      html = await options.afterRender(html, config)
    }

    html = await Transformers.process(html, config, options.env)

    if (typeof options.afterTransformers === 'function') {
      html = await options.afterTransformers(html, config)
    }

    return html
  } catch (error) {
    throw error
  }
}

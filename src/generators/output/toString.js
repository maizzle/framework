const marked = require('marked')
const fm = require('front-matter')
const deepmerge = require('deepmerge')
const NunjucksEnvironment = require('../../nunjucks')

const posthtml = require('posthtml')
const posthtmlContent = require('posthtml-content')

const Tailwind = require('../tailwind')
const Transformers = require('../../transformers')

module.exports = async (html, options) => {
  try {
    if (html && html.length < 1) {
      throw RangeError(`received empty string`)
    }

    if (typeof html !== 'string') {
      throw TypeError(`first argument must be a string, received ${html}`)
    }

    const css = options && options.tailwind && typeof options.tailwind.css == 'string' ? options.tailwind.css : ''
    const tailwindConfig  = options && options.tailwind && typeof options.tailwind.config == 'object' ?  options.tailwind.config : null
    const maizzleConfig  = options && options.maizzle && typeof options.maizzle.config == 'object' ?  options.maizzle.config : null

    if (!maizzleConfig) {
      throw TypeError(`Received invalid Maizzle config: ${maizzleConfig}`)
    }

    const frontMatter = fm(html)
    const config = deepmerge(maizzleConfig, frontMatter.attributes)
    const compiledCSS = await Tailwind.fromString(css, html, tailwindConfig, maizzleConfig).catch(err => { console.log(err); process.exit() })

    marked.setOptions({
      renderer: new marked.Renderer(),
      ...config.markdown
    })

    const nunjucks = NunjucksEnvironment.init()
    html = nunjucks.renderString(frontMatter.body, { page: config, css: compiledCSS })

    html = await posthtml([
      posthtmlContent({
        tailwind: css => Tailwind.fromString(css, html, tailwindConfig, config)
      })
    ]).process(html).then(res => res.html)

    html = await Transformers.process(html, config)

    return html
  }
  catch (error) {
    throw error
  }
}

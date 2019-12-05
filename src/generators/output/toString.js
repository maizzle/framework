const path = require('path')
const fs = require('fs-extra')

const marked = require('marked')
const fm = require('front-matter')
const deepmerge = require('deepmerge')
const NunjucksEnvironment = require('../../nunjucks')

const Tailwind = require('../tailwind')
const Transformers = require('../../transformers')

module.exports = async (str, options) => {
  try {
    if (str && str.length < 1) {
      throw RangeError(`received empty string`)
    }

    if (typeof str !== 'string') {
      throw TypeError(`first argument must be a string, received ${str}`)
    }

    const css = options && options.tailwind && typeof options.tailwind.css == 'string' ? options.tailwind.css : '@tailwind utilities;'
    const tailwindConfig  = options && options.tailwind && typeof options.tailwind.config == 'object' ?  options.tailwind.config : null
    const maizzleConfig  = options && options.maizzle && typeof options.maizzle.config == 'object' ?  options.maizzle.config : null

    if (!maizzleConfig) {
      throw TypeError(`Received invalid Maizzle config: ${maizzleConfig}`)
    }

    const frontMatter = fm(str)
    let html = frontMatter.body
    let tailwindHTML = html

    const config = deepmerge(maizzleConfig, frontMatter.attributes)
    const layout = config.layout || config.build.layout

    if (fs.existsSync(layout)) {
      html = `{% extends "${layout}" %}\n${html}`
      tailwindHTML = fs.readFileSync(path.resolve(process.cwd(), layout), 'utf8') + html
    }

    const compiledCSS = await Tailwind.fromString(css, tailwindHTML, tailwindConfig, maizzleConfig).catch(err => { console.log(err); process.exit(); })

    marked.setOptions({
      renderer: new marked.Renderer(),
      ...config.markdown
    })

    const nunjucks = NunjucksEnvironment.init()
    html = nunjucks.renderString(html, { page: config, css: compiledCSS })

    html = await Transformers.process(html, config)

    return html
  }
  catch (error) {
    throw error
  }
}

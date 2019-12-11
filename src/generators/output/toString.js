const path = require('path')
const fs = require('fs-extra')

const marked = require('marked')
const fm = require('front-matter')
const deepmerge = require('deepmerge')
const NunjucksEnvironment = require('../../nunjucks')
const { flattenObject } = require('../../utils/helpers')

const Tailwind = require('../tailwind')
const Transformers = require('../../transformers')

module.exports = async (str, options) => {
  try {
    if (str && str.length < 1) {
      throw RangeError('received empty string')
    }

    if (typeof str !== 'string') {
      throw TypeError(`first argument must be a string, received ${str}`)
    }

    const postCSS = options && options.tailwind && typeof options.tailwind.css === 'string' ? options.tailwind.css : '@tailwind utilities;'
    const tailwindConfig = options && options.tailwind && typeof options.tailwind.config === 'object' ? options.tailwind.config : null
    const maizzleConfig = options && options.maizzle && typeof options.maizzle.config === 'object' ? options.maizzle.config : null

    if (!maizzleConfig) {
      throw TypeError(`received invalid Maizzle config: ${maizzleConfig}`)
    }

    const frontMatter = fm(str)
    let html = frontMatter.body

    const config = maizzleConfig.isMerged ? maizzleConfig : deepmerge(maizzleConfig, frontMatter.attributes)
    const layout = config.layout || config.build.layout

    let compiledCSS = options.tailwind.compiled || null

    if (!compiledCSS) {
      if (!tailwindConfig) {
        throw TypeError(`received invalid Tailwind CSS config: ${tailwindConfig}`)
      }

      const defaultVariants = ['responsive', 'group-hover', 'focus-within', 'first', 'last', 'odd', 'even', 'hover', 'focus', 'active', 'visited', 'disabled'].join('|')
      const configVariants = Object.values(flattenObject(tailwindConfig.variants)).join('|')
      const prefixes = [
        Object.keys(tailwindConfig.theme.screens).join('|'),
        [defaultVariants, configVariants].join('|')
      ].join('|')

      const cssColons = `(${prefixes})(\\:)`
      const htmlColons = `(${prefixes})(:).+?\\s`

      const cssRegex = new RegExp(cssColons, 'g')
      const htmlRegex = new RegExp(htmlColons, 'g')

      html = html.replace(cssRegex, '$1-').replace(htmlRegex, '$1-')

      await fs.ensureFile(layout)
        .then(async () => {
          const tailwindHTML = await fs.readFile(path.resolve(process.cwd(), layout), 'utf8') + html
          tailwindConfig.separator = '-'
          compiledCSS = await Tailwind.fromString(postCSS, tailwindHTML, tailwindConfig, maizzleConfig).catch(err => { console.log(err); process.exit() })
        })
        .catch(err => {
          throw err
        })
    }

    marked.setOptions({
      renderer: new marked.Renderer(),
      ...config.markdown
    })

    const nunjucks = await NunjucksEnvironment.init()
    html = `{% extends "${layout}" %}\n${html}`
    html = nunjucks.renderString(html, { page: config, env: options.env, css: compiledCSS })

    const slashRegex = new RegExp('(?:-)(.)(/)(.)', 'g')
    html = html.replace('\\/', '-').replace(slashRegex, '-$1-$3')

    html = await Transformers.process(html, config)

    return html
  } catch (error) {
    throw error
  }
}

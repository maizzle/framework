const path = require('path')
const fs = require('fs-extra')
const postcss = require('postcss')
const tailwindcss = require('tailwindcss')
const atImport = require('postcss-import')
const postcssNested = require('postcss-nested')
const {get, isObject, isEmpty} = require('lodash')
const {requireUncached} = require('../utils/helpers')
const mergeLonghand = require('postcss-merge-longhand')
const purgecss = require('@fullhuman/postcss-purgecss')

const defaultPurgeCSSExtractor = /[\w-/:%.]+(?<!:)/g

module.exports = {
  compile: async (css = '', html = '', tailwindConfig = {}, maizzleConfig = {}) => {
    tailwindConfig = (isObject(tailwindConfig) && !isEmpty(tailwindConfig)) ? tailwindConfig : get(maizzleConfig, 'build.tailwind.config', 'tailwind.config.js')
    const tailwindConfigObject = (isObject(tailwindConfig) && !isEmpty(tailwindConfig)) ? tailwindConfig : requireUncached(path.resolve(process.cwd(), tailwindConfig))

    const purgeCSSOptions = get(maizzleConfig, 'purgeCSS', {})

    const buildTemplates = get(maizzleConfig, 'build.templates', [])
    const templateSources = Array.isArray(buildTemplates) ? buildTemplates.map(({source}) => `${source}/**/*.*`) : [buildTemplates].map(({source}) => `${source}/**/*.*`)
    const tailwindSources = Array.isArray(tailwindConfigObject.purge) ? tailwindConfigObject.purge : (isObject(tailwindConfigObject.purge) ? tailwindConfigObject.purge.content || [] : [])

    const extraPurgeSources = purgeCSSOptions.content || []

    const purgeSources = [
      'src/layouts/**/*.*',
      'src/partials/**/*.*',
      'src/components/**/*.*',
      ...templateSources,
      ...tailwindSources,
      ...extraPurgeSources,
      {raw: html}
    ]

    const extractor = get(tailwindConfigObject, 'purge.options.extractor') || purgeCSSOptions.extractor || defaultPurgeCSSExtractor
    const purgeSafeList = get(tailwindConfigObject, 'purge.options.safelist') || purgeCSSOptions.safelist || {}
    const purgeBlockList = get(tailwindConfigObject, 'purge.options.blocklist') || purgeCSSOptions.blocklist || []

    const purgeCssPlugin = maizzleConfig.env === 'local' ? () => {} : purgecss({
      content: purgeSources,
      defaultExtractor: content => content.match(extractor) || [],
      safelist: purgeSafeList,
      blocklist: [...purgeBlockList]
    })

    const mergeLonghandPlugin = maizzleConfig.env === 'local' ? () => {} : mergeLonghand()

    const tailwindPlugin = isEmpty(tailwindConfigObject) ? tailwindcss() : tailwindcss({
      important: true,
      purge: false,
      ...tailwindConfigObject
    })

    const postcssUserPlugins = get(maizzleConfig, 'build.postcss.plugins', [])

    const userFilePath = get(maizzleConfig, 'build.tailwind.css')

    css = await fs.pathExists(userFilePath).then(async exists => {
      if (exists) {
        const userFileCSS = await fs.readFile(path.resolve(userFilePath), 'utf8')
        return css + userFileCSS
      }

      return `@tailwind components;\n ${css}\n @tailwind utilities;`
    })

    return postcss([
      atImport({path: userFilePath ? path.dirname(userFilePath) : []}),
      postcssNested(),
      tailwindPlugin,
      purgeCssPlugin,
      mergeLonghandPlugin,
      ...postcssUserPlugins
    ])
      .process(css, {from: undefined})
      .then(result => result.css)
  }
}

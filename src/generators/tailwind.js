const path = require('path')
const fs = require('fs-extra')
const postcss = require('postcss')
const tailwind = require('tailwindcss')
const atImport = require('postcss-import')
const postcssNested = require('postcss-nested')
const mergeLonghand = require('postcss-merge-longhand')
const purgecss = require('@fullhuman/postcss-purgecss')
const {getPropValue, isObject, isEmptyObject, requireUncached} = require('../utils/helpers')

const defaultPurgeCSSExtractor = /[\w-/:%.]+(?<!:)/g

module.exports = {
  compile: async (css = '', html = '', tailwindConfig = {}, maizzleConfig = {}) => {
    tailwindConfig = (isObject(tailwindConfig) && !isEmptyObject(tailwindConfig)) ? tailwindConfig : getPropValue(maizzleConfig, 'build.tailwind.config') || 'tailwind.config.js'
    const tailwindConfigObject = (isObject(tailwindConfig) && !isEmptyObject(tailwindConfig)) ? tailwindConfig : requireUncached(path.resolve(process.cwd(), tailwindConfig))

    const purgeCSSOptions = getPropValue(maizzleConfig, 'purgeCSS') || {}

    const buildTemplates = getPropValue(maizzleConfig, 'build.templates') || []
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

    const extractor = getPropValue(tailwindConfigObject, 'purge.options.extractor') || purgeCSSOptions.extractor || defaultPurgeCSSExtractor
    const purgeWhitelist = getPropValue(tailwindConfigObject, 'purge.options.whitelist') || purgeCSSOptions.whitelist || []
    const purgewhitelistPatterns = getPropValue(tailwindConfigObject, 'purge.options.whitelistPatterns') || purgeCSSOptions.whitelistPatterns || []

    const purgeCssPlugin = maizzleConfig.env === 'local' ? () => {} : purgecss({
      content: purgeSources,
      defaultExtractor: content => content.match(extractor) || [],
      whitelist: purgeWhitelist,
      whitelistPatterns: purgewhitelistPatterns
    })

    const mergeLonghandPlugin = maizzleConfig.env === 'local' ? () => {} : mergeLonghand()

    const tailwindPlugin = isEmptyObject(tailwindConfigObject) ? tailwind() : tailwind({
      important: true,
      future: {
        removeDeprecatedGapUtilities: true,
        purgeLayersByDefault: true
      },
      ...tailwindConfigObject,
      purge: {
        enabled: false
      }
    })

    const postcssUserPlugins = getPropValue(maizzleConfig, 'build.postcss.plugins') || []

    const userFilePath = getPropValue(maizzleConfig, 'build.tailwind.css')

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

const path = require('path')
const fs = require('fs-extra')
const postcss = require('postcss')
const importCwd = require('import-cwd')
const tailwind = require('tailwindcss')
const mqpacker = require('css-mqpacker')
const atImport = require('postcss-import')
const postcssNested = require('postcss-nested')
const mergeLonghand = require('postcss-merge-longhand')
const purgecss = require('@fullhuman/postcss-purgecss')
const {getPropValue, isObject} = require('../utils/helpers')

const defaultPurgeCSSExtractor = /[\w-/:%.]+(?<!:)/g

module.exports = {
  fromFile: async (config, env) => {
    const tailwindConfig = isObject(config) ? getPropValue(config, 'build.tailwind.config') || {} : 'tailwind.config.js'
    const tailwindConfigObject = importCwd.silent(`./${tailwindConfig}`) || tailwindConfig

    const purgeCSSOptions = getPropValue(config, 'purgeCSS') || {}

    const templatesRoot = getPropValue(config, 'build.templates.root')

    const templateSources = Array.isArray(templatesRoot) ? templatesRoot.map(item => `${item}/**/*.*`) : [`./${templatesRoot}/**/*.*`]
    const tailwindSources = Array.isArray(tailwindConfigObject.purge) ? tailwindConfigObject.purge : (isObject(tailwindConfigObject.purge) ? tailwindConfigObject.purge.content || [] : [])
    const extraPurgeSources = purgeCSSOptions.content || []

    const purgeSources = [
      'src/layouts/**/*.*',
      'src/partials/**/*.*',
      'src/components/**/*.*',
      ...templateSources,
      ...tailwindSources,
      ...extraPurgeSources
    ]

    const extractor = getPropValue(tailwindConfigObject, 'purge.options.extractor') || purgeCSSOptions.extractor || defaultPurgeCSSExtractor
    const purgeWhitelist = getPropValue(tailwindConfigObject, 'purge.options.whitelist') || purgeCSSOptions.whitelist || []
    const purgewhitelistPatterns = getPropValue(tailwindConfigObject, 'purge.options.whitelistPatterns') || purgeCSSOptions.whitelistPatterns || []

    const purgeCssPlugin = env === 'local' ? () => {} : purgecss({
      content: purgeSources,
      defaultExtractor: content => content.match(extractor) || [],
      whitelist: purgeWhitelist,
      whitelistPatterns: purgewhitelistPatterns
    })

    const mergeLonghandPlugin = env === 'local' ? () => {} : mergeLonghand()

    const postcssUserPlugins = getPropValue(config, 'build.postcss.plugins') || []

    const userFilePath = getPropValue(config, 'build.tailwind.css')

    const cssString = await fs.pathExists(userFilePath)
      .then(exists => exists ? fs.readFile(path.resolve(userFilePath), 'utf8') : '@tailwind components; @tailwind utilities;')

    const tailwindPlugin = tailwind({
      target: 'ie11',
      ...tailwindConfigObject,
      purge: {
        enabled: false
      }
    })

    return postcss([
      atImport({path: userFilePath ? path.dirname(userFilePath) : []}),
      postcssNested(),
      tailwindPlugin,
      purgeCssPlugin,
      mqpacker({sort: true}),
      mergeLonghandPlugin,
      ...postcssUserPlugins
    ])
      .process(cssString, {from: undefined})
      .then(result => result.css)
  },
  fromString: async (css, html, tailwindConfig = {}, maizzleConfig = {}) => {
    const extractor = getPropValue(tailwindConfig, 'purge.options.extractor') || getPropValue(maizzleConfig, 'purgeCSS.extractor') || defaultPurgeCSSExtractor
    const purgeWhitelist = getPropValue(tailwindConfig, 'purge.options.whitelist') || getPropValue(maizzleConfig, 'purgeCSS.whitelist') || []
    const purgewhitelistPatterns = getPropValue(tailwindConfig, 'purge.options.whitelistPatterns') || getPropValue(maizzleConfig, 'purgeCSS.whitelistPatterns') || []

    const tailwindSources = Array.isArray(tailwindConfig.purge) ? tailwindConfig.purge : (isObject(tailwindConfig.purge) ? tailwindConfig.purge.content || [] : [])
    const purgeContent = getPropValue(maizzleConfig, 'purgeCSS.content') || []

    const postcssUserPlugins = getPropValue(maizzleConfig, 'build.postcss.plugins') || []

    const tailwindPlugin = tailwind({
      target: 'ie11',
      ...tailwindConfig,
      purge: {
        enabled: false
      }
    })

    return postcss([
      postcssNested(),
      tailwindPlugin,
      purgecss({
        content: [
          ...tailwindSources,
          ...purgeContent,
          {raw: html}
        ],
        defaultExtractor: content => content.match(extractor) || [],
        whitelist: purgeWhitelist,
        whitelistPatterns: purgewhitelistPatterns
      }),
      mqpacker(),
      mergeLonghand(),
      ...postcssUserPlugins
    ])
      .process(css, {from: undefined})
      .then(result => result.css)
      .catch(error => {
        throw error
      })
  }
}

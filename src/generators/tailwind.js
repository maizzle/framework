const path = require('path')
const fs = require('fs-extra')
const postcss = require('postcss')
const tailwind = require('tailwindcss')
const mqpacker = require('css-mqpacker')
const atImport = require('postcss-import')
const postcssNested = require('postcss-nested')
const mergeLonghand = require('postcss-merge-longhand')
const purgecss = require('@fullhuman/postcss-purgecss')
const {getPropValue, isObject, isEmptyObject} = require('../utils/helpers')

const defaultPurgeCSSExtractor = /[\w-/:%.]+(?<!:)/g

module.exports = {
  fromFile: async (config, env) => {
    const purgeCSSOptions = getPropValue(config, 'purgeCSS') || {}
    const templatesRoot = getPropValue(config, 'build.templates.root')

    const templateSources = Array.isArray(templatesRoot) ? templatesRoot.map(item => `${item}/**/*.*`) : [`./${templatesRoot}/**/*.*`]
    const extraPurgeSources = purgeCSSOptions.content || ['src/layouts/**/*.*', 'src/partials/**/*.*', 'src/components/**/*.*']

    const purgeSources = [
      ...templateSources,
      ...extraPurgeSources
    ]

    const extractor = purgeCSSOptions.extractor || defaultPurgeCSSExtractor
    const purgeWhitelist = purgeCSSOptions.whitelist || []
    const purgewhitelistPatterns = purgeCSSOptions.whitelistPatterns || []

    const purgeCssPlugin = env === 'local' ? () => {} : purgecss({
      content: purgeSources,
      defaultExtractor: content => content.match(extractor) || [],
      whitelist: purgeWhitelist,
      whitelistPatterns: purgewhitelistPatterns
    })

    const mergeLonghandPlugin = env === 'local' ? () => {} : mergeLonghand()

    const tailwindConfig = isObject(config) ? getPropValue(config, 'build.tailwind.config') || {} : {}
    const tailwindPlugin = isEmptyObject(tailwindConfig) ? tailwind() : tailwind(tailwindConfig)

    const postcssUserPlugins = getPropValue(config, 'build.postcss.plugins') || []

    const userFilePath = getPropValue(config, 'build.tailwind.css')

    const cssString = await fs.pathExists(userFilePath)
      .then(exists => exists ? fs.readFile(path.resolve(userFilePath), 'utf8') : '@tailwind components; @tailwind utilities;')

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
  fromString: async (css, html, tailwindConfig, maizzleConfig) => {
    const tailwindPlugin = isEmptyObject(tailwindConfig) ? tailwind() : tailwind(tailwindConfig)

    const extractor = getPropValue(maizzleConfig, 'purgeCSS.extractor') || defaultPurgeCSSExtractor
    const purgeContent = getPropValue(maizzleConfig, 'purgeCSS.content') || []
    const purgeWhitelist = getPropValue(maizzleConfig, 'purgeCSS.whitelist') || []
    const purgewhitelistPatterns = getPropValue(maizzleConfig, 'purgeCSS.whitelistPatterns') || []

    const postcssUserPlugins = getPropValue(maizzleConfig, 'build.postcss.plugins') || []

    return postcss([
      postcssNested(),
      tailwindPlugin,
      purgecss({
        content: [
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

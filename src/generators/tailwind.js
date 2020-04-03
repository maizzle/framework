const path = require('path')
const fs = require('fs-extra')
const postcss = require('postcss')
const tailwind = require('tailwindcss')
const mqpacker = require('css-mqpacker')
const atImport = require('postcss-import')
const postcssNested = require('postcss-nested')
const { getPropValue } = require('../utils/helpers')
const mergeLonghand = require('postcss-merge-longhand')
const purgecss = require('@fullhuman/postcss-purgecss')

const defaultPurgeCSSExtractor = /[\w-/:%.]+(?<!:)/g

module.exports = {
  fromFile: async (config, env) => {
    const purgeCSSOpts = config.purgeCSS || {}
    const tailwindConfigFile = getPropValue(config, 'build.tailwind.config') || {}
    const templatesRoot = getPropValue(config, 'build.posthtml.templates.root')

    const templateSources = Array.isArray(templatesRoot) ? templatesRoot.map(item => `${item}/**/*.*`) : [`./${templatesRoot}/**/*.*`]

    const extraPurgeSources = (purgeCSSOpts && purgeCSSOpts.content) ? purgeCSSOpts.content : []
    const purgeSources = [
      ...templateSources,
      ...extraPurgeSources
    ]

    const extractor = purgeCSSOpts.extractor || defaultPurgeCSSExtractor
    const purgeWhitelist = purgeCSSOpts.whitelist || []
    const purgewhitelistPatterns = purgeCSSOpts.whitelistPatterns || []

    const mergeLonghandPlugin = env === 'local' ? () => { } : mergeLonghand()

    const purgeCssPlugin = env === 'local' ? () => { } : purgecss({
      content: purgeSources,
      defaultExtractor: content => content.match(extractor) || [],
      whitelist: purgeWhitelist,
      whitelistPatterns: purgewhitelistPatterns
    })

    const userFilePath = getPropValue(config, 'build.tailwind.css')

    const cssString = await fs.pathExists(userFilePath)
      .then(() => fs.readFile(path.resolve(userFilePath)))
      .catch(() => '@tailwind components; @tailwind utilities;')

    return postcss([
      atImport({ path: userFilePath ? path.dirname(userFilePath) : [] }),
      postcssNested(),
      tailwind(tailwindConfigFile),
      purgeCssPlugin,
      mqpacker({ sort: true }),
      mergeLonghandPlugin
    ])
      .process(cssString, { from: undefined })
      .then(result => {
        if (!result.css.trim()) {
          throw new Error('Tailwind CSS was compiled to empty string.')
        }

        return result.css
      })
      .catch(error => {
        throw error
      })
  },
  fromString: async (css, html, tailwindConfig, maizzleConfig) => {
    const tailwindPlugin = typeof tailwindConfig === 'object' ? tailwind(tailwindConfig) : tailwind()

    const extractor = getPropValue(maizzleConfig, 'purgeCSS.extractor') || defaultPurgeCSSExtractor
    const purgeContent = getPropValue(maizzleConfig, 'purgeCSS.content') || []
    const purgeWhitelist = getPropValue(maizzleConfig, 'purgeCSS.whitelist') || []
    const purgewhitelistPatterns = getPropValue(maizzleConfig, 'purgeCSS.whitelistPatterns') || []

    return postcss([
      postcssNested(),
      tailwindPlugin,
      purgecss({
        content: [
          ...purgeContent,
          { raw: html }
        ],
        defaultExtractor: content => content.match(extractor) || [],
        whitelist: purgeWhitelist,
        whitelistPatterns: purgewhitelistPatterns
      }),
      mqpacker(),
      mergeLonghand()
    ])
      .process(css, { from: undefined })
      .then(result => {
        if (!result.css.trim()) {
          throw new Error('Tailwind CSS was compiled to empty string.')
        }

        return result.css
      })
      .catch(error => {
        throw error
      })
  }
}

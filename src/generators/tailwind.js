const path = require('path')
const fs = require('fs-extra')
const postcss = require('postcss')
const tailwind = require('tailwindcss')
const mqpacker = require('css-mqpacker')
const atImport = require('postcss-import')
const postcssNested = require('postcss-nested')
const mergeLonghand = require('postcss-merge-longhand')
const purgecss = require('@fullhuman/postcss-purgecss')

module.exports = {
  fromFile: async (config, env) => {
    try {
      const purgeCSSOpts = config.cleanup.purgeCSS
      const tailwindConfigFile = config.build.tailwind.config || 'tailwind.config.js'

      const extraPurgeSources = (purgeCSSOpts && purgeCSSOpts.content) ? purgeCSSOpts.content : []
      const purgeSources = [
        `./${config.build.templates.source}/**/*.*`,
        ...extraPurgeSources
      ]

      const extractor = purgeCSSOpts.extractor || /[\w-/:]+(?<!:)/g
      const purgeWhitelist = purgeCSSOpts.whitelist || []
      const purgewhitelistPatterns = purgeCSSOpts.whitelistPatterns || []

      const mergeLonghandPlugin = env === 'local' ? () => { } : mergeLonghand()

      const purgeCssPlugin = env === 'local' ? () => { } : purgecss({
        content: purgeSources,
        defaultExtractor: content => content.match(extractor) || [],
        whitelist: purgeWhitelist,
        whitelistPatterns: purgewhitelistPatterns
      })

      const file = await fs.readFile(path.resolve(config.build.tailwind.css))

      return await postcss([
        atImport({ path: [path.dirname(config.build.tailwind.css)] }),
        postcssNested(),
        tailwind(tailwindConfigFile),
        purgeCssPlugin,
        mqpacker({ sort: true }),
        mergeLonghandPlugin
      ])
        .process(file, { from: undefined })
        .then(result => {
          if (!result.css.trim()) {
            throw new Error('Tailwind CSS was compiled to empty string.')
          }

          return result.css
        })
    } catch (err) {
      throw err
    }
  },
  fromString: async (css, html, tailwindConfig, maizzleConfig) => {
    try {
      const tailwindPlugin = typeof tailwindConfig === 'object' ? tailwind(tailwindConfig) : tailwind()

      const extractor = maizzleConfig.cleanup.purgeCSS.extractor || /[\w-/:]+(?<!:)/g
      const purgeContent = maizzleConfig.cleanup.purgeCSS.content || [];
      const purgeWhitelist = maizzleConfig.cleanup.purgeCSS.whitelist || []
      const purgewhitelistPatterns = maizzleConfig.cleanup.purgeCSS.whitelistPatterns || []

      return await postcss([
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
    } catch (err) {
      throw err
    }
  }
}

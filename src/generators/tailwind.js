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
      let extraPurgeSources = (config.cleanup.purgeCSS && config.cleanup.purgeCSS.content) ? config.cleanup.purgeCSS.content : []
      let purgeSources = [
        `./${config.build.templates.source}/**/*.*`,
        ...extraPurgeSources
      ]

      let purgeWhitelist, purgewhitelistPatterns = []

      if (config.cleanup.purgeCSS) {
        purgeWhitelist = config.cleanup.purgeCSS.whitelist || []
        purgewhitelistPatterns = config.cleanup.purgeCSS.whitelistPatterns || []
      }

      const tailwindConfigFile = config.build.tailwind.config || 'tailwind.config.js'

      const mqpackerPlugin = env == 'local' ? () => { } : mqpacker()
      const mergeLonghandPlugin = env == 'local' ? () => { } : mergeLonghand()
      const purgeCssPlugin = env == 'local' ? () => { } : purgecss({ content: purgeSources, whitelist: purgeWhitelist, whitelistPatterns: purgewhitelistPatterns })

      const file = await fs.readFile(path.resolve(config.build.tailwind.css))

      return await postcss([
        atImport({path: [path.dirname(config.build.tailwind.css)]}),
        postcssNested(),
        tailwind(tailwindConfigFile),
        purgeCssPlugin,
        mqpackerPlugin,
        mergeLonghandPlugin
      ])
      .process(file, { from: undefined })
      .then(result => {
        if (!result.css.trim()) {
          throw Error("Tailwind CSS was compiled to empty string.")
        }

        // Temporary fix for Tailwind CSS escaped characters
        return result.css.replace(/\\-/g, '-')
      })
    }
    catch (err) {
      throw err
    }
  },
  fromString: async (css, html, tailwindConfig) => {
    try {
      const tailwindPlugin = typeof tailwindConfig == 'object' ? tailwind(tailwindConfig) : tailwind()

      return await postcss([
        postcssNested(),
        tailwindPlugin,
        purgecss({ content: [{raw: html}] }),
        mqpacker(),
        mergeLonghand()
      ])
      .process(css, { from: undefined })
      .then(result => {
        if (!result.css.trim()) {
          throw Error("Tailwind CSS was compiled to empty string.")
        }

        // Temporary fix for Tailwind CSS escaped characters
        return result.css.replace(/\\-/g, '-')
      })
    } catch (err) {
      throw err
    }
  }
}

const path = require('path')
const fs = require('fs-extra')
const postcss = require('postcss')
const tailwind = require('tailwindcss')
const mqpacker = require('css-mqpacker')
const atImport = require('postcss-import')
const postcssNested = require('postcss-nested')
const mergeLonghand = require('postcss-merge-longhand')
const purgecss = require('@fullhuman/postcss-purgecss')

const defaultPurgeCSSExtractor = /[\w-/:%.]+(?<!:)/g

module.exports = {
  fromFile: async (config, env) => {
    const purgeCSSOpts = config.purgeCSS || {}
    const tailwindConfigFile = config.build.tailwind.config || 'tailwind.config.js'

    const templateSources = Array.isArray(config.build.posthtml.templates.root) ? config.build.posthtml.templates.root.map(item => `${item}/**/*.*`) : [`./${config.build.posthtml.templates.root}/**/*.*`]

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

    const file = await fs.readFile(path.resolve(config.build.tailwind.css))

    return postcss([
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
      .catch(error => {
        throw error
      })
  },
  fromString: async (css, html, tailwindConfig, maizzleConfig) => {
    const tailwindPlugin = typeof tailwindConfig === 'object' ? tailwind(tailwindConfig) : tailwind()

    const extractor = maizzleConfig.purgeCSS.extractor || defaultPurgeCSSExtractor
    const purgeContent = maizzleConfig.purgeCSS.content || []
    const purgeWhitelist = maizzleConfig.purgeCSS.whitelist || []
    const purgewhitelistPatterns = maizzleConfig.purgeCSS.whitelistPatterns || []

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

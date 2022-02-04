const path = require('path')
const fs = require('fs-extra')
const postcss = require('postcss')
const tailwindcss = require('tailwindcss')
const postcssImport = require('postcss-import')
const postcssNested = require('tailwindcss/nesting')
const {requireUncached} = require('../utils/helpers')
const mergeLonghand = require('postcss-merge-longhand')
const {get, isObject, isEmpty, merge} = require('lodash')

module.exports = {
  compile: async (css = '', html = '', tailwindConfig = {}, maizzleConfig = {}) => {
    tailwindConfig = (isObject(tailwindConfig) && !isEmpty(tailwindConfig)) ? tailwindConfig : get(maizzleConfig, 'build.tailwind.config', 'tailwind.config.js')

    // Compute the Tailwind config to use
    const userConfig = () => {
      // If a custom config object was passed, use that
      if (isObject(tailwindConfig) && !isEmpty(tailwindConfig)) {
        return tailwindConfig
      }

      /**
       * Try loading a fresh tailwind.config.js, with fallback to an empty object.
       * This will use the default Tailwind config (with rem units etc)
       */
      try {
        return requireUncached(path.resolve(process.cwd(), tailwindConfig))
      } catch {
        return {}
      }
    }

    // Merge user's Tailwind config on top of a 'base' config
    const config = merge({
      important: true,
      content: {
        files: [
          './src/**/*.*',
          {raw: html, extension: 'html'}
        ]
      },
      corePlugins: {
        preflight: false,
        animation: false,
        backgroundOpacity: false,
        borderOpacity: false,
        boxShadow: false,
        divideOpacity: false,
        placeholderOpacity: false,
        ringColor: false,
        ringWidth: false,
        ringOpacity: false,
        ringOffsetColor: false,
        textOpacity: false
      },
      plugins: []
    }, userConfig())

    // Add back the `{raw: html}` option if user provided own config
    if (Array.isArray(config.content)) {
      config.content = {
        files: [
          ...config.content,
          './src/**/*.*',
          {raw: html, extension: 'html'}
        ]
      }
    }

    // Include all `build.templates.source` paths when scanning for selectors to preserve
    const buildTemplates = get(maizzleConfig, 'build.templates')

    if (buildTemplates) {
      const templateObjects = Array.isArray(buildTemplates) ? buildTemplates : [buildTemplates]
      const templateSources = templateObjects.map(template => {
        const source = get(template, 'source')

        return `${source}/**/*.*`
      })

      config.content.files.push(...templateSources)
    }

    // Merge user's Tailwind plugins with our default ones
    config.plugins.push(require('tailwindcss-box-shadow'))

    const userFilePath = get(maizzleConfig, 'build.tailwind.css', path.join(process.cwd(), 'src/css/tailwind.css'))
    const userFileExists = await fs.pathExists(userFilePath)

    if (userFileExists) {
      css = await fs.readFile(path.resolve(userFilePath), 'utf8')
    }

    return postcss([
      postcssImport({path: path.dirname(userFilePath)}),
      postcssNested(),
      tailwindcss(config),
      maizzleConfig.env === 'local' ? () => {} : mergeLonghand(),
      ...get(maizzleConfig, 'build.postcss.plugins', [])
    ])
      .process(css, {from: undefined})
      .then(result => result.css)
  }
}

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
    const tailwindConfigObject = (isObject(tailwindConfig) && !isEmpty(tailwindConfig)) ? tailwindConfig : requireUncached(path.resolve(process.cwd(), tailwindConfig))

    const coreConfig = {
      important: true,
      purge: {
        enabled: maizzleConfig.env !== 'local',
        content: [
          'src/**/*.*',
          {raw: html}
        ],
        options: get(maizzleConfig, 'purgeCSS', {})
      },
      corePlugins: {
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
      plugins: [
        require('tailwindcss-box-shadow')
      ]
    }

    const userFilePath = get(maizzleConfig, 'build.tailwind.css')

    css = await fs.pathExists(userFilePath).then(async exists => {
      if (exists) {
        const userFileCSS = await fs.readFile(path.resolve(userFilePath), 'utf8')
        return userFileCSS
      }

      return css
    })

    return postcss([
      postcssImport({path: userFilePath ? path.dirname(userFilePath) : []}),
      postcssNested(),
      tailwindcss(merge(coreConfig, tailwindConfigObject)),
      maizzleConfig.env === 'local' ? () => {} : mergeLonghand(),
      ...get(maizzleConfig, 'build.postcss.plugins', [])
    ])
      .process(css, {from: undefined})
      .then(result => result.css)
  }
}

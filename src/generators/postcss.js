const path = require('path')
const {get} = require('lodash')
const postcss = require('postcss')
const postcssImport = require('postcss-import')
const postcssNested = require('tailwindcss/nesting')
const mergeLonghand = require('postcss-merge-longhand')

module.exports = {
  process: async (css = '', maizzleConfig = {}, spinner = null) => {
    const userFilePath = get(maizzleConfig, 'build.tailwind.css', path.join(process.cwd(), 'src/css/tailwind.css'))

    return postcss([
      postcssImport({path: path.dirname(userFilePath)}),
      postcssNested(),
      maizzleConfig.env === 'local' ? () => {} : mergeLonghand(),
      ...get(maizzleConfig, 'build.postcss.plugins', [])
    ])
      .process(css, {from: undefined})
      .then(result => result.css)
      .catch(error => {
        console.error(error)
        if (spinner) {
          spinner.stop()
        }

        throw new Error(`PostCSS processing failed`)
      })
  }
}

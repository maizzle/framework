const ora = require('ora')
const bs = require('browser-sync')
const Output = require('./generators/output')
const {getPropValue} = require('./utils/helpers')

const self = module.exports = { // eslint-disable-line
  render: async (html, options) => Output.toString(html, options),
  build: async (env, config) => {
    env = env || 'local'
    const start = new Date()
    const spinner = ora('Building emails...').start()

    return Output.toDisk(env, spinner, config)
      .then(response => {
        spinner.succeed(`Built ${response.count} templates in ${new Date() - start} ms.`)
        return response.files
      })
      .catch(error => {
        throw error
      })
  },
  serve: async () => {
    await self.build().catch(error => {
      throw error
    })

    require('./generators/config')
      .getMerged('local')
      .then(config => {
        const bsOptions = getPropValue(config, 'build.browsersync') || {}
        const templatesRoot = getPropValue(config, 'build.templates.root')
        const watchPaths = bsOptions.watch || ['src/**/*.*', 'tailwind.config.js']
        const baseDir = getPropValue(config, 'build.destination.path') || 'build_local'

        if (Array.isArray(templatesRoot)) {
          templatesRoot.forEach(root => watchPaths.push(root))
        } else if (typeof templatesRoot === 'string') {
          watchPaths.push(templatesRoot)
        }

        bs.create()
        bs.init({
          server: {
            baseDir,
            directory: bsOptions.directory || true
          },
          ui: bsOptions.ui || {port: 3001},
          port: bsOptions.port || 3000,
          notify: bsOptions.notify || false,
          tunnel: bsOptions.tunnel || false,
          open: bsOptions.open || false
        })
          .watch(watchPaths)
          .on('change', async () => {
            await self.build()
              .then(() => bs.reload())
              .catch(error => {
                throw error
              })
          })
      })
  }
}

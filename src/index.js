const ora = require('ora')
const bs = require('browser-sync')
const Output = require('./generators/output')
const {getPropValue} = require('./utils/helpers')

const self = module.exports = { // eslint-disable-line
  render: async (html, options) => Output.toString(html, options),
  build: async (env = 'local', config = {}) => {
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
  serve: async config => {
    await self.build('local', config).catch(error => {
      throw error
    })

    require('./generators/config')
      .getMerged('local')
      .then(config => {
        const baseDir = getPropValue(config, 'build.destination.path') || 'build_local'
        const templatesRoot = getPropValue(config, 'build.templates.root')
        const bsOptions = {
          notify: false,
          open: false,
          port: 3000,
          server: {
            baseDir,
            directory: true
          },
          tunnel: false,
          ui: {port: 3001},
          ...getPropValue(config, 'build.browsersync')
        }
        const watchPaths = bsOptions.watch || ['src/**/*.*', 'tailwind.config.js']

        if (Array.isArray(templatesRoot)) {
          templatesRoot.forEach(root => watchPaths.push(root))
        } else if (typeof templatesRoot === 'string') {
          watchPaths.push(templatesRoot)
        }

        bs.create()

        bs.init(bsOptions)
          .watch(watchPaths)
          .on('change', async () => {
            await self.build('local', config)
              .then(() => bs.reload())
              .catch(error => {
                throw error
              })
          })
      })
  }
}

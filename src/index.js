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
      .then(files => {
        spinner.succeed(`Processed ${files.length} files in ${new Date() - start} ms.`)
        return files
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
        const buildTemplates = getPropValue(config, 'build.templates')
        const templatesPaths = Array.isArray(buildTemplates) ? buildTemplates : [buildTemplates]
        const baseDir = getPropValue(templatesPaths[0], 'destination.path') || 'build_local'

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
        const watchPaths = [
          'src/**/*.*',
          'tailwind.config.js',
          ...new Set(bsOptions.watch)
        ]

        if (templatesPaths[0]) {
          templatesPaths.forEach(({source}) => watchPaths.push(`${source}/**/*.*`))
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

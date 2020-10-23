const ora = require('ora')
const path = require('path')
const fs = require('fs-extra')
const deepmerge = require('deepmerge')
const bs = require('browser-sync')
const injector = require('bs-html-injector')
const Output = require('./generators/output')
const {getPropValue} = require('./utils/helpers')

const self = module.exports = { // eslint-disable-line
  render: async (html, options) => Output.toString(html, options),
  build: async (env = 'local', config = {}) => {
    const start = new Date()
    const spinner = ora('Building emails...').start()

    return Output.toDisk(env, spinner, config)
      .then(({files, parsed}) => {
        spinner.succeed(`Built ${parsed.length} templates in ${new Date() - start} ms.`)
        return files
      })
      .catch(error => {
        throw error
      })
  },
  serve: async config => {
    await self
      .build('local', config)
      .then(async () => {
        require('./generators/config')
          .getMerged('local')
          .then(localConfig => {
            config = deepmerge(config, localConfig)

            let templates = getPropValue(config, 'build.templates')
            templates = Array.isArray(templates) ? templates : [templates]

            const baseDir = getPropValue(templates[0], 'destination.path') || 'build_local'

            const watchPaths = [
              'src/**/*.*',
              getPropValue(config, 'build.tailwind.config') || 'tailwind.config.js',
              ...new Set(templates.map(config => `${getPropValue(config, 'source') || 'src'}/**/*.*`)),
              ...new Set(getPropValue(config, 'build.browsersync.watch'))
            ]

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

            bs.create()

            bs.use(injector)

            bs.init(bsOptions, () => {})

            bs.watch(watchPaths)
              .on('change', async file => {
                file = file.replace(/\\/g, '/')
                const fileSource = getPropValue(templates.filter(v => path.dirname(file).replace(/\\/g, '/').includes(v.source))[0], 'source')

                // Only if this file is in one of the build.templates.source paths
                if (templates.map(o => o.source).includes(fileSource)) {
                  const start = new Date()
                  const spinner = ora('Compiling...').start()

                  const destination = getPropValue(templates.filter(v => path.dirname(file).replace(/\\/g, '/').includes(v.source))[0], 'destination.path')
                  const cssString = fs.existsSync(getPropValue(config, 'build.tailwind.css')) ?
                    fs.readFileSync(getPropValue(config, 'build.tailwind.css')) :
                    '@tailwind components; @tailwind utilities;'

                  if (config.events && typeof config.events.beforeCreate === 'function') {
                    await config.events.beforeCreate(config)
                  }

                  await self.render(await fs.readFile(file, 'utf8'), {
                    maizzle: config,
                    tailwind: {
                      css: cssString
                    },
                    ...config.events
                  })
                    .then(async ({html}) => {
                      await fs.outputFile(path.join(destination, file.replace(fileSource, '')), html)
                        .then(() => {
                          injector()
                          spinner.succeed(`Done in ${new Date() - start} ms.`)
                        })
                    })
                } else {
                  await self.build('local', config).then(() => bs.reload())
                }
              })
          })
      })
      .catch(error => {
        throw error
      })
  }
}

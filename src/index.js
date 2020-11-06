const ora = require('ora')
const path = require('path')
const fs = require('fs-extra')
const bs = require('browser-sync')
const {get, merge} = require('lodash')
const injector = require('bs-html-injector')
const Output = require('./generators/output')
const Plaintext = require('./generators/plaintext')

const self = module.exports = { // eslint-disable-line
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
  render: async (html, options) => Output.toString(html, options),
  plaintext: async (html, config = {}) => Plaintext.generate(html, false, config),
  serve: async config => {
    await self
      .build('local', config)
      .then(async () => {
        require('./generators/config')
          .getMerged('local')
          .then(localConfig => {
            config = merge(config, localConfig)

            let templates = get(config, 'build.templates')
            templates = Array.isArray(templates) ? templates : [templates]

            const baseDir = get(templates[0], 'destination.path', 'build_local')

            const watchPaths = [
              'src/**/*.*',
              get(config, 'build.tailwind.config', 'tailwind.config.js'),
              ...new Set(templates.map(config => `${get(config, 'source', 'src')}/**/*.*`)),
              ...new Set(get(config, 'build.browsersync.watch', []))
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
              ...get(config, 'build.browsersync', {})
            }

            bs.create()

            bs.use(injector)

            bs.init(bsOptions, () => {})

            bs.watch(watchPaths)
              .on('change', async file => {
                file = file.replace(/\\/g, '/')
                const fileSource = get(templates.filter(v => path.dirname(file).replace(/\\/g, '/').includes(v.source))[0], 'source')

                // Only if this file is in one of the build.templates.source paths
                if (templates.map(o => o.source).includes(fileSource)) {
                  const start = new Date()
                  const spinner = ora('Building email...').start()

                  const destination = get(templates.filter(v => path.dirname(file).replace(/\\/g, '/').includes(v.source))[0], 'destination.path')
                  const cssString = fs.existsSync(get(config, 'build.tailwind.css')) ? fs.readFileSync(get(config, 'build.tailwind.css')) : '@tailwind components; @tailwind utilities;'

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

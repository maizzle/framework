const ora = require('ora')
const path = require('path')
const fs = require('fs-extra')
const chokidar = require('chokidar')
const {get, merge} = require('lodash')
const bs = require('browser-sync').create()
const Output = require('./generators/output')
const transformers = require('./transformers')
const Plaintext = require('./generators/plaintext')
const Tailwind = require('./generators/tailwindcss')

const self = module.exports = { // eslint-disable-line
  ...transformers,
  render: async (html, options) => Output.toString(html, options),
  plaintext: async (html, config = {}) => Plaintext.generate(html, false, config),
  build: async (env = 'local', config = {}) => {
    const start = new Date()
    const spinner = ora('Building emails...').start()

    return Output.toDisk(env, spinner, config)
      .then(({files, parsed}) => {
        spinner.succeed(`Built ${parsed.length} templates in ${Date.now() - start} ms.`)
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
          .then(async localConfig => {
            config = merge(config, localConfig)

            let templates = get(config, 'build.templates')
            templates = Array.isArray(templates) ? templates : [templates]

            // File watchers
            const templatePaths = [...new Set(templates.map(config => `${get(config, 'source', 'src')}/**`))]

            const otherPaths = [
              `src/!(${templatePaths.join('|').replace(/src\//g, '').replace(/\/\*/g, '')})/**`,
              get(config, 'build.tailwind.config', 'tailwind.config.js'),
              [...new Set(get(config, 'build.browsersync.watch', []))]
            ]

            // Compile Tailwind early
            const cssString = fs.existsSync(get(config, 'build.tailwind.css')) ? fs.readFileSync(get(config, 'build.tailwind.css'), 'utf8') : '@tailwind components; @tailwind utilities;'
            const css = await Tailwind.compile(cssString, '', {}, config)

            // Browsersync
            const baseDir = templates.map(t => t.destination.path)

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

            bs.init(bsOptions, () => {})

            const templatesWatcher = chokidar.watch(templatePaths)
            const globalWatcher = chokidar.watch(otherPaths)

            templatesWatcher
              .on('change', async file => {
                file = file.replace(/\\/g, '/')
                const fileSource = get(templates.filter(v => path.dirname(file).replace(/\\/g, '/').includes(v.source))[0], 'source')

                const start = new Date()
                const spinner = ora('Building email...').start()

                const destination = get(templates.filter(t => path.dirname(file).replace(/\\/g, '/').includes(t.source))[0], 'destination.path')

                if (config.events && typeof config.events.beforeCreate === 'function') {
                  await config.events.beforeCreate(config)
                }

                await self.render(await fs.readFile(file, 'utf8'), {
                  maizzle: config,
                  tailwind: {
                    compiled: css
                  },
                  ...config.events
                })
                  .then(async ({html}) => {
                    await fs.outputFile(path.join(destination, file.replace(fileSource, '')), html)
                      .then(() => {
                        bs.reload()
                        spinner.succeed(`Done in ${Date.now() - start} ms.`)
                      })
                  })
              })

            globalWatcher
              .on('change', async () => {
                await self.build('local', config).then(() => bs.reload())
              })
          })
      })
      .catch(error => {
        throw error
      })
  }
}

const ora = require('ora')
const path = require('path')
const fs = require('fs-extra')
const Config = require('./generators/config')
const Output = require('./generators/output')
const transformers = require('./transformers')
const {get, merge, isObject} = require('lodash')
const {clearConsole} = require('./utils/helpers')
const Plaintext = require('./generators/plaintext')

const getBrowserSync = () => {
  if (!global.cachedBrowserSync) {
    const bs = require('browser-sync')
    global.cachedBrowserSync = bs.create()
  }

  return global.cachedBrowserSync
}

const self = module.exports = { // eslint-disable-line
  ...transformers,
  render: async (html, options) => Output.toString(html, options),
  plaintext: async (html, config = {}) => Plaintext.generate(html, false, config),
  build: async (env = 'local', config = {}) => {
    const start = new Date()
    const spinner = ora('Building emails...').start()

    return Output.toDisk(env, spinner, config)
      .then(({files, parsed}) => {
        const elapsedSeconds = (Date.now() - start) / 1000

        if (get(config, 'build.command') === 'serve') {
          if (get(config, 'build.console.clear')) {
            clearConsole()
          }

          spinner.succeed(`Re-built ${parsed.length} templates in ${elapsedSeconds}s`)
        } else {
          spinner.succeed(`Built ${parsed.length} templates in ${elapsedSeconds}s`)
        }

        return {files}
      })
      .catch(error => {
        throw error
      })
  },
  serve: async (env = 'local', config = {}) => {
    config = merge(
      config,
      await Config.getMerged(env),
      {
        build: {
          command: 'serve'
        }
      }
    )

    await self
      .build(env, config)
      .then(async () => {
        let templates = get(config, 'build.templates')
        templates = Array.isArray(templates) ? templates : [templates]

        const templatePaths = [...new Set(templates.map(config => `${get(config, 'source', 'src')}/**`))]
        const globalPaths = [
          'src/**',
          get(config, 'build.tailwind.config', 'tailwind.config.js'),
          [...new Set(get(config, 'build.browsersync.watch', []))]
        ]

        const spinner = ora()

        // Watch for Template file changes
        getBrowserSync().watch(templatePaths)
          .on('change', async file => {
            if (get(config, 'build.console.clear')) {
              clearConsole()
            }

            const start = new Date()

            spinner.start('Building email...')

            file = file.replace(/\\/g, '/')

            if (config.events && typeof config.events.beforeCreate === 'function') {
              await config.events.beforeCreate(config)
            }

            const renderOptions = {
              maizzle: config,
              ...config.events
            }

            self
              .render(await fs.readFile(file, 'utf8'), renderOptions)
              .then(async ({html, config}) => {
                let dest = ''
                let ext = ''

                if (Array.isArray(config.build.templates)) {
                  // Might need to ensure both paths end the same (with/without slash)
                  const match = config.build.templates.find(template => template.source === path.parse(file).dir)
                  dest = get(match, 'destination.path', 'build_local')
                  ext = get(match, 'destination.ext', 'html')
                } else if (isObject(config.build.templates)) {
                  dest = get(config, 'build.templates.destination.path', 'build_local')
                  ext = get(config, 'build.templates.destination.ext', 'html')
                }

                const finalDestination = path.join(dest, `${path.parse(file).name}.${ext}`)

                await fs.outputFile(config.permalink || finalDestination, html)
              })
              .then(() => {
                getBrowserSync().reload()
                spinner.succeed(`Compiled in ${(Date.now() - start) / 1000}s [${file}]`)
              })
              .catch(() => spinner.warn(`Received empty HTML, please save your file again [${file}]`))
          })

        // Watch for changes in all other files
        getBrowserSync().watch(globalPaths, {ignored: templatePaths})
          .on('change', () => self.build(env, config).then(() => getBrowserSync().reload()))
          .on('unlink', () => self.build(env, config).then(() => getBrowserSync().reload()))

        // Watch for changes in config files
        getBrowserSync().watch('config*.js')
          .on('change', async file => {
            const parsedEnv = path.parse(file).name.split('.')[1] || 'local'

            Config
              .getMerged(parsedEnv)
              .then(config => self.build(parsedEnv, config).then(() => getBrowserSync().reload()))
          })

        // Browsersync options
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
          logFileChanges: false,
          ...get(config, 'build.browsersync', {})
        }

        // Initialize Browsersync
        getBrowserSync().init(bsOptions, () => {})
      })
      .catch(error => {
        throw error
      })
  }
}

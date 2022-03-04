const ora = require('ora')
const path = require('path')
const fs = require('fs-extra')

const Config = require('../generators/config')
const buildToFile = require('../commands/build')
const renderToString = require('../functions/render')

const {get, merge, isObject} = require('lodash')
const {clearConsole} = require('../utils/helpers')

const browsersync = () => {
  if (!global.cachedBrowserSync) {
    const bs = require('browser-sync')
    global.cachedBrowserSync = bs.create()
  }

  return global.cachedBrowserSync
}

const serve = async (env = 'local', config = {}) => {
  config = merge(
    config,
    await Config.getMerged(env),
    {
      build: {
        command: 'serve'
      }
    }
  )

  const spinner = ora()

  try {
    await buildToFile(env, config)

    let templates = get(config, 'build.templates')
    templates = Array.isArray(templates) ? templates : [templates]

    const templatePaths = [...new Set(templates.map(config => `${get(config, 'source', 'src')}/**`))]
    const globalPaths = [
      'src/**',
      get(config, 'build.tailwind.config', 'tailwind.config.js'),
      [...new Set(get(config, 'build.browsersync.watch', []))]
    ]

    // Watch for Template file changes
    browsersync()
      .watch(templatePaths)
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

        renderToString(
          await fs.readFile(file, 'utf8'),
          renderOptions
        )
          .then(async ({html, config}) => {
            let dest = ''
            let ext = ''

            if (Array.isArray(config.build.templates)) {
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
            browsersync().reload()
            spinner.succeed(`Compiled in ${(Date.now() - start) / 1000}s [${file}]`)
          })
          .catch(() => spinner.warn(`Received empty HTML, please save your file again [${file}]`))
      })

    // Watch for changes in all other files
    browsersync()
      .watch(globalPaths, {ignored: templatePaths})
      .on('change', () => buildToFile(env, config).then(() => browsersync().reload()))
      .on('unlink', () => buildToFile(env, config).then(() => browsersync().reload()))

    // Watch for changes in config files
    browsersync()
      .watch('config*.js')
      .on('change', async file => {
        const parsedEnv = path.parse(file).name.split('.')[1] || 'local'

        Config
          .getMerged(parsedEnv)
          .then(config => buildToFile(parsedEnv, config).then(() => browsersync().reload()))
      })

    // Browsersync options
    const baseDir = templates.map(t => t.destination.path)

    // Initialize Browsersync
    browsersync()
      .init({
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
      }, () => {})
  } catch (error) {
    spinner.fail(error)
    throw error
  }
}

module.exports = serve

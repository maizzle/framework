const ora = require('ora')
const path = require('path')
const fs = require('fs-extra')

const Config = require('../generators/config')
const buildToFile = require('../commands/build')
const renderToString = require('../functions/render')

const {get, isObject} = require('lodash')
const {clearConsole, merge} = require('../utils/helpers')

/**
 * Initialize Browsersync on-demand
 * https://github.com/maizzle/framework/issues/605
 */
const browsersync = () => {
  if (!global.cachedBrowserSync) {
    const bs = require('browser-sync')
    global.cachedBrowserSync = bs.create()
  }

  return global.cachedBrowserSync
}

const getConfig = async (env = 'local', config = {}) => merge(
  config,
  await Config.getMerged(env)
)

const serve = async (env = 'local', config = {}) => {
  config = await getConfig(env, merge(config, {
    build: {
      command: 'serve'
    }
  }))

  const spinner = ora()

  // Build all emails first
  await buildToFile(env, config)

  // Set some paths to watch
  let templates = get(config, 'build.templates')
  templates = Array.isArray(templates) ? templates : [templates]

  const templatePaths = [...new Set(templates.map(config => `${get(config, 'source', 'src')}/**`))]
  const tailwindConfig = get(config, 'build.tailwind.config', 'tailwind.config.js')
  const globalPaths = [
    'src/**',
    ...new Set(get(config, 'build.browsersync.watch', []))
  ]

  if (typeof tailwindConfig === 'string') {
    globalPaths.push(tailwindConfig)
  }

  // Watch for Template file changes
  browsersync()
    .watch(templatePaths)
    .on('change', async file => {
      config = await getConfig(env, config)

      if (config.events && typeof config.events.beforeCreate === 'function') {
        await config.events.beforeCreate(config)
      }

      // Don't render if file type is not configured
      // eslint-disable-next-line
      const filetypes = templates.reduce((acc, template) => {
        return [...acc, ...get(template, 'filetypes', ['html'])]
      }, [])

      if (!filetypes.includes(path.extname(file).slice(1))) {
        return
      }

      // Clear console if enabled
      if (get(config, 'build.console.clear')) {
        clearConsole()
      }

      // Start the spinner
      const start = new Date()
      spinner.start('Building email...')

      // Render the template
      renderToString(
        await fs.readFile(file.replace(/\\/g, '/'), 'utf8'),
        {
          maizzle: merge(
            config,
            {
              build: {
                current: {
                  path: path.parse(file)
                }
              }
            }
          ),
          ...config.events
        }
      )
        .then(async ({html, config}) => {
          // Write the file to disk
          let source = ''
          let dest = ''
          let ext = ''

          if (Array.isArray(config.build.templates)) {
            const match = config.build.templates.find(template => template.source === path.parse(file).dir)
            source = path.normalize(get(match, 'source'))
            dest = path.normalize(get(match, 'destination.path', 'build_local'))
            ext = get(match, 'destination.ext', 'html')
          } else if (isObject(config.build.templates)) {
            source = path.normalize(get(config, 'build.templates.source'))
            dest = path.normalize(get(config, 'build.templates.destination.path', 'build_local'))
            ext = get(config, 'build.templates.destination.ext', 'html')
          }

          const fileDir = path.parse(file).dir.replace(source, '')
          const finalDestination = path.join(dest, fileDir, `${path.parse(file).name}.${ext}`)

          await fs.outputFile(config.permalink || finalDestination, html)
        })
        .then(() => {
          browsersync().reload()
          spinner.succeed(`Compiled in ${(Date.now() - start) / 1000}s [${file}]`)
        })
        .catch(error => {
          throw error
        })
    })

  // Watch for changes in all other files
  browsersync()
    .watch(globalPaths, {ignored: templatePaths})
    .on('change', () => buildToFile(env, config)
      .then(() => browsersync().reload())
      .catch(error => {
        throw error
      })
    )
    .on('unlink', () => buildToFile(env, config)
      .then(() => browsersync().reload())
      .catch(error => {
        throw error
      })
    )

  // Watch for changes in config files
  browsersync()
    .watch('{maizzle.config*,config*}.{js,cjs}')
    .on('change', async file => {
      const fileName = path.parse(file).base
      const match = fileName.match(/\.?config\.(.+?)\./)

      const parsedEnv = match ? match[1] : env || 'local'

      Config
        .getMerged(parsedEnv)
        .then(config => buildToFile(parsedEnv, config)
          .then(() => browsersync().reload())
          .catch(error => {
            throw error
          })
        )
    })

  // Browsersync options
  const baseDir = templates.map(t => t.destination.path)

  // Initialize Browsersync
  browsersync()
    .init(
      merge(
        {
          notify: false,
          open: false,
          port: 3000,
          server: {
            baseDir,
            directory: true
          },
          tunnel: false,
          ui: {port: 3001},
          logFileChanges: false
        },
        get(config, 'build.browsersync', {})
      ), () => {})
}

module.exports = serve

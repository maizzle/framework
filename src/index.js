const ora = require('ora')
const path = require('path')
const fs = require('fs-extra')
const {get, merge} = require('lodash')
const bs = require('browser-sync').create()
const Config = require('./generators/config')
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

        // Pre-compile Tailwind so that updates to tailwind.config.js are reflected
        const cssString = fs.existsSync(get(config, 'build.tailwind.css')) ? fs.readFileSync(get(config, 'build.tailwind.css'), 'utf8') : '@tailwind components; @tailwind utilities;'
        const css = await Tailwind.compile(cssString, '', {}, config)

        const spinner = ora()

        // Watch for Template file changes
        bs.watch(templatePaths)
          .on('change', async file => {
            const start = new Date()

            spinner.start('Building email...')

            file = file.replace(/\\/g, '/')

            const destination = get(config, 'build.currentTemplates.destination.path', 'build_local')
            const extension = get(config, 'build.currentTemplates.destination.extension', 'html')
            const fileSource = get(config, 'build.currentTemplates.source')
            const parts = path.parse(path.join(destination, file.replace(fileSource, '')))
            const finalDestination = path.join(parts.dir, `${parts.name}.${extension}`)

            if (config.events && typeof config.events.beforeCreate === 'function') {
              await config.events.beforeCreate(config)
            }

            /**
             * Tailwind CSS compiler
             *
             * Use the Just-In-Time engine if the user enabled it
             * Fall back to the classic Always-On-Time engine
             */
            let mode = 'aot'

            try {
              const tailwindConfig = require(path.resolve(process.cwd(), get(config, 'build.currentTemplates.tailwind.config', 'tailwind.config.js')))
              mode = get(tailwindConfig, 'mode')
            } catch {}

            const renderOptions = {
              maizzle: config,
              ...config.events
            }

            // AOT: fall back to pre-compiled CSS
            if (mode !== 'jit') {
              renderOptions.tailwind = {
                compiled: css
              }
            }

            self
              .render(await fs.readFile(file, 'utf8'), renderOptions)
              .then(({html, config}) => fs.outputFile(config.permalink || finalDestination, html))
              .then(() => {
                bs.reload()
                spinner.succeed(`Done in ${Date.now() - start} ms.`)
              })
              .catch(() => {
                spinner.warn('Received empty HTML, please save your file again')
              })
          })

        // Watch for changes in all other files
        bs.watch(globalPaths, {ignored: templatePaths})
          .on('change', () => self.build(env, config).then(() => bs.reload()))
          .on('unlink', () => self.build(env, config).then(() => bs.reload()))

        // Watch for changes in config files
        bs.watch('config*.js')
          .on('change', async file => {
            const parsedEnv = path.parse(file).name.split('.')[1] || 'local'

            Config
              .getMerged(parsedEnv)
              .then(config => self.build(parsedEnv, config).then(() => bs.reload()))
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
        bs.init(bsOptions, () => {})
      })
      .catch(error => {
        throw error
      })
  }
}

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
          `src/!(${templatePaths.join('|').replace(/src\//g, '').replace(/\/\*/g, '')})/**`,
          get(config, 'build.tailwind.config', 'tailwind.config.js'),
          [...new Set(get(config, 'build.browsersync.watch', []))]
        ]

        // Compile Tailwind so that updates to tailwind.config.js are reflected
        const cssString = fs.existsSync(get(config, 'build.tailwind.css')) ? fs.readFileSync(get(config, 'build.tailwind.css'), 'utf8') : '@tailwind components; @tailwind utilities;'
        const css = await Tailwind.compile(cssString, '', {}, config)

        // Watch for Template file changes
        bs.watch(templatePaths)
          .on('change', async file => {
            const start = new Date()
            const spinner = ora('Building email...').start()

            file = file.replace(/\\/g, '/')

            const fileSource = get(config, 'build.currentTemplates.source')
            const destination = get(config, 'build.currentTemplates.destination.path')
            const extension = get(config, 'build.currentTemplates.destination.extension', 'html')

            let finalDestination = path.join(destination, file.replace(fileSource, ''))

            if (extension !== 'html') {
              const parts = path.parse(file)
              finalDestination = path.join(destination, `${parts.name}.${extension}`)
            }

            if (config.events && typeof config.events.beforeCreate === 'function') {
              await config.events.beforeCreate(config)
            }

            let mode = 'aot'

            try {
              const tailwindConfig = require(path.resolve(process.cwd(), get(config, 'build.currentTemplates.tailwind.config', 'tailwind.config.js')))
              mode = get(tailwindConfig, 'mode')
            } catch {}

            const renderOptions = {
              maizzle: config,
              ...config.events
            }

            // Use pre-compiled CSS only when not using JIT
            if (mode !== 'jit') {
              renderOptions.tailwind = {
                compiled: css
              }
            }

            self
              .render(await fs.readFile(file, 'utf8'), renderOptions)
              .then(({html}) => fs.outputFile(finalDestination, html))
              .then(() => {
                bs.reload()
                spinner.succeed(`Done in ${Date.now() - start} ms.`)
              })
              .catch(() => {
                spinner.warn('Received empty HTML, please save your file again')
              })
          })

        // Watch for changes in all other files
        bs.watch(globalPaths)
          .on('change', () => self.build(env).then(() => bs.reload()))

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

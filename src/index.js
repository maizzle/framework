const ora = require('ora')
const bs = require('browser-sync')
const Output = require('./generators/output')
const { getPropValue } = require('./utils/helpers')

const self = module.exports = {
  render: async (html, options) => Output.toString(html, options),
  build: async env => {
    env = env || 'local'
    const start = new Date()
    const spinner = ora('Building emails...').start()

    return Output.toDisk(env, spinner)
      .then(total => spinner.succeed(`Built ${total} templates in ${new Date() - start} ms.`))
      .catch(error => { spinner.fail('Build failed'); console.error(error); process.exit(1) })
  },
  serve: async () => {
    await self.build().catch(error => { console.error(error); process.exit(1) })

    require('./generators/config')
      .getMerged('local')
      .then(config => {
        const bsOptions = getPropValue(config, 'browsersync') || {}
        const watchPaths = bsOptions.watch || []
        const templatesRoot = getPropValue(config, 'build.templates.root')
        const baseDir = getPropValue(config, 'build.destination.path') || 'build_local'

        watchPaths.push('tailwind.config.js')

        if (Array.isArray(templatesRoot)) {
          templatesRoot.forEach(root => watchPaths.push(root))
        } else if (typeof templatesRoot === 'string') {
          watchPaths.push(templatesRoot)
        }

        bs.create()
        bs.init({
          server: {
            baseDir: baseDir,
            directory: bsOptions.directory || true
          },
          ui: bsOptions.ui || { port: 3001 },
          port: bsOptions.port || 3000,
          notify: bsOptions.notify || false,
          tunnel: bsOptions.tunnel || false,
          open: bsOptions.open || false
        })
          .watch(watchPaths)
          .on('change', async () => {
            await self.build()
              .then(() => bs.reload())
              .catch(error => { console.error(error); process.exit(1) })
          })
      })
  }
}

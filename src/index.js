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
        const watchPaths = getPropValue(config, 'browsersync.watch') || []
        bs.create()
        bs.init({
          server: {
            baseDir: getPropValue(config, 'build.destination.path') || 'build_local',
            directory: getPropValue(config, 'browsersync.directory') || true
          },
          ui: getPropValue(config, 'browsersync.ui') || { port: 3001 },
          port: getPropValue(config, 'browsersync.port') || 3000,
          notify: getPropValue(config, 'browsersync.notify') || false,
          tunnel: getPropValue(config, 'browsersync.tunnel') || false,
          open: getPropValue(config, 'browsersync.open') || false
        })
          .watch(
            [
              `./${getPropValue(config, 'build.templates.root') || 'src/templates'}/**/*.*`,
              `./${getPropValue(config, 'build.assets.source') || 'src/assets/images'}/**/*.*`,
              './tailwind.config.js',
              ...watchPaths
            ]
          )
          .on('change', async () => {
            await self.build()
              .then(() => bs.reload())
              .catch(error => { console.error(error); process.exit(1) })
          })
      })
  }
}

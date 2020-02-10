const ora = require('ora')
const bs = require('browser-sync')
const Output = require('./generators/output')

const self = module.exports = {
  render: async (html, options) => Output.toString(html, options),
  build: async env => {
    env = env || 'local'
    const start = new Date()
    const spinner = ora('Building emails...').start()

    return Output.toDisk(env, spinner)
      .then(total => spinner.succeed(`Built ${total} templates in ${new Date() - start} ms.`))
      .catch(err => { spinner.fail('Build failed'); console.error(err); process.exit() })
  },
  serve: async () => {
    await self.build()

    require('./generators/config')
      .getMerged('local')
      .then(config => {
        const { open = true } = config.browsersync
        const watchPaths = config.browsersync.watch || []
        bs.create()
        bs.init({
          server: {
            baseDir: config.build.destination.path,
            directory: config.browsersync.directory
          },
          ui: config.browsersync.ui,
          port: config.browsersync.port || 3000,
          notify: config.browsersync.notify,
          tunnel: config.browsersync.tunnel,
          open
        })
          .watch(
            [
              `./${config.build.templates.source}/**/*.*`,
              `./${config.build.assets.source}/**/*.*`,
              './tailwind.config.js',
              ...watchPaths
            ]
          )
          .on('change', async () => { await self.build(); bs.reload() })
      })
  }
}

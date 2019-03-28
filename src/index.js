const ora = require('ora')
const bs = require("browser-sync")
const Output = require('./generators/output')

const self = module.exports = {
  render: async (html, options) => Output.toString(html, options).catch(err => console.error(err)),
  build: async env => {
    env = env || 'local'
    let start = new Date()
    let spinner = ora('Building emails...').start()

    return Output.toDisk(env, spinner)
      .then(total => spinner.succeed(`Built ${total} templates in ${new Date() - start} ms.`))
      .catch(err => { spinner.fail('Build failed'); console.error(err); process.exit(); })
  },
  serve: async () => {
    await self.build()

    require('./generators/config')
      .getMerged()
      .then(config => {
        let watchPaths = config.browsersync.watch || []
        bs.create()
        bs.init({
          server: {
            baseDir: config.build.destination.path,
            directory: config.browsersync.directory
          },
          port: config.browsersync.port || 3000,
          notify: config.browsersync.notify,
          tunnel: config.browsersync.tunnel
        })
        .watch(
          [
            `./${config.build.templates.source}/**/*.*`,
            `./${config.build.assets.source}/**/*.*`,
            `./tailwind.config.js`,
            ...watchPaths,
          ]
        )
        .on("change", async () => { await self.build(); bs.reload(); })
    })
  },
}

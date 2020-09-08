const path = require('path')
const fs = require('fs-extra')
const glob = require('glob-promise')
const removePlaintextTags = require('../../transformers/plaintext')
const {asyncForEach, getPropValue, isEmptyObject} = require('../../utils/helpers')

const Config = require('../config')
const Tailwind = require('../tailwind')
const Plaintext = require('../plaintext')

const render = require('./to-string')

module.exports = async (env, spinner, config) => {
  process.env.NODE_ENV = env || 'local'

  if (isEmptyObject(config)) {
    config = await Config.getMerged(env).catch(error => {
      spinner.fail('Build failed')
      throw error
    })
  }

  const buildTemplates = getPropValue(config, 'build.templates')
  const templatesConfig = Array.isArray(buildTemplates) ? buildTemplates : [buildTemplates]

  const parsed = []
  let files = []
  const css = await Tailwind.compile('', '', {}, config)

  await asyncForEach(templatesConfig, async templateConfig => {
    const outputDir = getPropValue(templateConfig, 'destination.path') || `build_${env}`

    await fs.remove(outputDir)

    await fs
      .copy(templateConfig.source, outputDir)
      .then(async () => {
        const filetypes = Array.isArray(templateConfig.filetypes) ? templateConfig.filetypes.join('|') : templateConfig.filetypes || 'html'
        const templates = await glob(`${outputDir}/**/*.+(${filetypes})`)

        if (templates.length === 0) {
          spinner.warn(`Error: no files with the .${filetypes} extension found in ${templateConfig.source}`)
          return
        }

        if (config.events && typeof config.events.beforeCreate === 'function') {
          await config.events.beforeCreate(config)
        }

        await asyncForEach(templates, async file => {
          const html = await fs.readFile(file, 'utf8')

          await render(html, {
            maizzle: {
              ...config,
              env
            },
            tailwind: {
              compiled: css
            },
            ...config.events
          })
            .then(async ({html, config}) => {
              const destination = config.permalink || file

              if (templateConfig.plaintext) {
                await Plaintext.prepare(html, destination, config)
                  .then(async ({target, plaintext}) => {
                    await fs.outputFile(target, plaintext)
                    html = removePlaintextTags(html, config)
                  })
              }

              await fs.outputFile(destination, html)
                .then(async () => {
                  const extension = getPropValue(templateConfig, 'destination.extension') || 'html'

                  if (extension !== 'html') {
                    const parts = path.parse(destination)
                    await fs.move(destination, `${parts.dir}/${parts.name}.${extension}`)
                  }

                  files.push(file)
                  parsed.push(file)
                })
            })
            .catch(error => {
              switch (config.build.fail) {
                case 'silent':
                  spinner.warn(`Failed to compile template: ${path.basename(file)}`)
                  break
                case 'verbose':
                  spinner.warn(`Failed to compile template: ${path.basename(file)}`)
                  console.error(error)
                  break
                default:
                  spinner.fail(`Failed to compile template: ${path.basename(file)}`)
                  throw error
              }
            })
        })

        const assets = {source: '', destination: 'assets', ...getPropValue(templateConfig, 'assets')}

        if (Array.isArray(assets.source)) {
          await asyncForEach(assets.source, async source => {
            if (fs.existsSync(source)) {
              await fs.copy(source, path.join(templateConfig.destination.path, assets.destination)).catch(error => spinner.warn(error.message))
            }
          })
        } else {
          if (fs.existsSync(assets.source)) {
            await fs.copy(assets.source, path.join(templateConfig.destination.path, assets.destination)).catch(error => spinner.warn(error.message))
          }
        }

        await glob(path.join(templateConfig.destination.path, '/**/*.*'))
          .then(contents => {
            files = [...new Set([...files, ...contents])]
          })
      })
      .catch(error => spinner.warn(error.message))
  })

  if (config.events && typeof config.events.afterBuild === 'function') {
    await config.events.afterBuild(files)
  }

  return parsed
}

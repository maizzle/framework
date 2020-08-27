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
  if (isEmptyObject(config)) {
    config = await Config.getMerged(env).catch(error => {
      spinner.fail('Build failed')
      throw error
    })
  }

  const css = await Tailwind.compile('', '', {}, config)

  const sourceDir = getPropValue(config, 'build.templates.root') || 'src/templates'
  const outputDir = getPropValue(config, 'build.destination.path') || `build_${env}`
  let filetypes = getPropValue(config, 'build.templates.extensions') || 'html'

  await fs.remove(outputDir)

  if (Array.isArray(filetypes)) {
    filetypes = filetypes.join('|')
  }

  if (Array.isArray(sourceDir)) {
    await asyncForEach(sourceDir, async source => {
      await fs.copy(source, outputDir).catch(error => spinner.warn(error.message))
    })
  } else {
    await fs.copy(sourceDir, outputDir).catch(error => spinner.warn(error.message))
  }

  const templates = await glob(`${outputDir}/**/*.+(${filetypes})`)

  if (templates.length === 0) {
    spinner
      .fail(`Error: no files with the .${filetypes} extension found in your \`templates.root\` path${Array.isArray(sourceDir) ? 's' : ''}`)
      .fail('Build failed')

    throw new Error('no templates found')
  }

  if (config.events && typeof config.events.beforeCreate === 'function') {
    await config.events.beforeCreate(config)
  }

  await asyncForEach(templates, async file => {
    const html = await fs.readFile(file, 'utf8')

    await render(html, {
      maizzle: {
        config: {
          ...config,
          env
        }
      },
      tailwind: {
        compiled: css
      },
      ...[config.events || []]
    })
      .then(async ({html, config}) => {
        const destination = config.permalink || file

        if (config.plaintext) {
          await Plaintext.prepare(html, file, config)
            .then(async ({destination, plaintext}) => {
              await fs.outputFile(destination, plaintext)
              html = removePlaintextTags(html, config)
            })
        }

        fs.outputFile(destination, html)
          .then(async () => {
            const extension = getPropValue(config, 'build.destination.extension') || 'html'

            if (extension !== 'html') {
              const parts = path.parse(destination)
              await fs.rename(destination, `${parts.dir}/${parts.name}.${extension}`)
            }
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

  const assets = {source: '', destination: 'assets', ...getPropValue(config, 'build.assets')}

  if (Array.isArray(assets.source)) {
    await asyncForEach(assets.source, async source => {
      if (fs.existsSync(source)) {
        await fs.copy(source, `${outputDir}/${assets.destination}`).catch(error => spinner.warn(error.message))
      }
    })
  } else {
    if (fs.existsSync(assets.source)) {
      await fs.copy(assets.source, `${outputDir}/${assets.destination}`).catch(error => spinner.warn(error.message))
    }
  }

  const files = await glob(`${outputDir}/**/*.*`)

  if (config.events && typeof config.events.afterBuild === 'function') {
    await config.events.afterBuild(files)
  }

  return {
    files,
    count: templates.length
  }
}

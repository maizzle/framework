const path = require('path')
const fs = require('fs-extra')
const fm = require('front-matter')
const glob = require('glob-promise')
const deepmerge = require('deepmerge')
const removePlaintextTags = require('../../transformers/plaintext')
const {asyncForEach, getPropValue} = require('../../utils/helpers')

const Config = require('../config')
const Tailwind = require('../tailwind')
const Plaintext = require('../plaintext')

const render = require('./to-string')

module.exports = async (env, spinner) => {
  const config = await Config.getMerged(env).catch(error => {
    spinner.fail('Build failed')
    throw error
  })
  const css = await Tailwind.fromFile(config, env).catch(error => {
    spinner.fail('Build failed')
    throw error
  })

  const sourceDir = getPropValue(config, 'build.templates.root') || 'src/templates'
  const outputDir = getPropValue(config, 'build.destination.path') || `build_${env}`
  let filetypes = getPropValue(config, 'build.templates.extensions') || 'html'

  if (fs.pathExistsSync(outputDir)) {
    await fs.remove(outputDir)
  }

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
    let html = await fs.readFile(file, 'utf8')
    const frontMatter = fm(html)
    const templateConfig = deepmerge(config, frontMatter.attributes)
    const events = templateConfig.events || []

    templateConfig.isMerged = true
    templateConfig.env = env

    try {
      html = await render(html, {
        tailwind: {
          compiled: css
        },
        maizzle: {
          config: templateConfig
        },
        ...events
      })
    } catch (error) {
      switch (templateConfig.build.fail) {
        case 'silent':
          spinner.warn(`Failed to compile ${file}`)
          break
        case 'verbose':
          spinner.warn(`Failed to compile ${file}`)
          console.error(error)
          break
        default:
          spinner.fail(`Failed to compile ${file}`)
          throw error
      }
    }

    if (templateConfig.plaintext) {
      await Plaintext.prepare(html, file, templateConfig)
        .then(({destination, plaintext}) => fs.outputFile(destination, plaintext))
    }

    html = removePlaintextTags(html, config)

    fs.outputFile(file, html)
      .then(async () => {
        if (templateConfig.permalink) {
          await fs.move(file, templateConfig.permalink, {overwrite: true})
        }

        const extension = getPropValue(templateConfig, 'build.destination.extension') || 'html'

        if (extension !== 'html') {
          const parts = path.parse(file)
          await fs.rename(file, `${parts.dir}/${parts.name}.${extension}`)
        }
      })
  })

  const assets = getPropValue(config, 'build.assets') || {source: '', destination: 'assets'}

  if (fs.pathExistsSync(assets.source)) {
    await fs.copy(assets.source, `${outputDir}/${assets.destination}`)
  }

  if (config.events && typeof config.events.afterBuild === 'function') {
    const files = await glob(`${outputDir}/**/*.*`)
    await config.events.afterBuild(files)
  }

  return templates.length
}

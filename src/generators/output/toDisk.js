const path = require('path')
const fs = require('fs-extra')
const fm = require('front-matter')
const glob = require('glob-promise')
const deepmerge = require('deepmerge')
const { asyncForEach } = require('../../utils/helpers')
const removePlaintextTags = require('../../transformers/plaintext')

const Config = require('../config')
const Tailwind = require('../tailwind')
const Plaintext = require('../plaintext')

const render = require('./toString')

module.exports = async (env, spinner) => {
  const config = await Config.getMerged(env).catch(err => { spinner.fail('Build failed'); console.log(err); process.exit() })
  const css = await Tailwind.fromFile(config, env).catch(err => { spinner.fail('Build failed'); console.log(err); process.exit() })

  const sourceDir = config.build.posthtml.templates.root
  const outputDir = config.build.destination.path

  await fs.remove(outputDir)

  if (Array.isArray(sourceDir)) {
    await asyncForEach(sourceDir, path => fs.copy(path, outputDir))
  } else {
    await fs.copy(sourceDir, outputDir)
  }

  let filetypes = config.build.posthtml.templates.extensions || 'html'

  if (Array.isArray(filetypes)) {
    filetypes = filetypes.join('|')
  }

  const templates = await glob(`${outputDir}/**/*.+(${filetypes})`)

  if (templates.length < 1) {
    throw RangeError(`No files of type "${filetypes}" found in \`${sourceDir}\`. If the path is correct, please check \`build.templates.extensions\` in your config.`)
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

    html = await render(html, {
      tailwind: {
        compiled: css
      },
      maizzle: {
        config: templateConfig
      },
      ...events
    })

    const ext = templateConfig.build.destination.extension || 'html'

    if (templateConfig.plaintext) {
      await Plaintext.output(html, file, templateConfig)
    }

    html = removePlaintextTags(html, config)

    fs.outputFile(file, html)
      .then(() => {
        if (templateConfig.permalink) {
          return fs.move(file, templateConfig.permalink, { overwrite: true })
        }

        const parts = path.parse(file)
        fs.rename(file, `${parts.dir}/${parts.name}.${ext}`)
      })
  })

  if (fs.pathExistsSync(config.build.assets.source)) {
    await fs.copy(config.build.assets.source, `${outputDir}/${config.build.assets.destination}`)
  }

  if (config.events && typeof config.events.afterBuild === 'function') {
    const files = await glob(`${outputDir}/**/*.*`)
    await config.events.afterBuild(files)
  }

  return templates.length
}

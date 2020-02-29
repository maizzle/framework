const path = require('path')
const fs = require('fs-extra')
const fm = require('front-matter')
const glob = require('glob-promise')
const deepmerge = require('deepmerge')
const stripHTML = require('string-strip-html')
const { asyncForEach } = require('../../utils/helpers')

const Config = require('../config')
const Tailwind = require('../tailwind')

const render = require('./toString')

module.exports = async (env, spinner) => {
  const config = await Config.getMerged(env).catch(err => { spinner.fail('Build failed'); console.log(err); process.exit() })
  const css = await Tailwind.fromFile(config, env).catch(err => { spinner.fail('Build failed'); console.log(err); process.exit() })

  const sourceDir = config.build.templates.source
  const outputDir = config.build.destination.path

  await fs.remove(outputDir)

  if (Array.isArray(sourceDir)) {
    await asyncForEach(sourceDir, path => fs.copy(path, outputDir))
  } else {
    await fs.copy(sourceDir, outputDir)
  }

  let filetypes = config.build.templates.filetypes || 'html|njk|nunjucks'

  if (Array.isArray(filetypes)) {
    filetypes = filetypes.join('|')
  }

  const templates = await glob(`${outputDir}/**/*.+(${filetypes})`)

  if (templates.length < 1) {
    throw RangeError(`No "${filetypes}" templates found in \`${sourceDir}\`. If the path is correct, please check your \`build.templates.filetypes\` config setting.`)
  }

  if (config.events && typeof config.events.beforeCreate === 'function') {
    await config.events.beforeCreate(config)
  }

  await asyncForEach(templates, async file => {
    let html = await fs.readFile(file, 'utf8')
    const frontMatter = fm(html)
    const templateConfig = deepmerge(config, frontMatter.attributes)
    templateConfig.isMerged = true

    const events = templateConfig.events || []

    html = await render(html, {
      tailwind: {
        compiled: css
      },
      maizzle: {
        config: templateConfig
      },
      env: env,
      ...events
    })

    const ext = templateConfig.build.destination.extension || 'html'

    fs.outputFile(file, html)
      .then(() => {
        if (templateConfig.plaintext) {
          const plaintext = stripHTML(html,
            {
              dumpLinkHrefsNearby: {
                enabled: true,
                putOnNewLine: true,
                wrapHeads: '[',
                wrapTails: ']'
              }
            })

          const filepath = templateConfig.permalink || file
          const plaintextPath = path.join(path.dirname(filepath), path.basename(filepath, path.extname(filepath)) + '.txt')

          fs.outputFileSync(plaintextPath, plaintext)
        }

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

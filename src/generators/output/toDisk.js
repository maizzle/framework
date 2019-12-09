const path = require('path')
const fs = require('fs-extra')
const fm = require('front-matter')
const glob = require('glob-promise')
const deepmerge = require('deepmerge')
const helpers = require('../../utils/helpers')
const stripHTML = require('string-strip-html')
// const NunjucksEnvironment = require('../../nunjucks')

const Config = require('../config')
const Tailwind = require('../tailwind')

const render = require('./toString')

module.exports = async (env, spinner) => {
  const globalConfig = await Config.getMerged(env).catch(err => { spinner.fail('Build failed'); console.log(err); process.exit() })
  const css = await Tailwind.fromFile(globalConfig, env).catch(err => { spinner.fail('Build failed'); console.log(err); process.exit() })
  const outputDir = path.resolve(`${globalConfig.build.destination.path}`)

  await fs.remove(outputDir)
  await fs.copy(globalConfig.build.templates.source, outputDir)

  let filetypes = globalConfig.build.templates.filetypes || 'html|njk|nunjucks'

  if (Array.isArray(filetypes)) {
    filetypes = filetypes.join('|')
  }

  const templates = await glob(`${outputDir}/**/*.+(${filetypes})`)

  if (templates.length < 1) {
    throw RangeError(`No "${filetypes}" templates found in \`${globalConfig.build.templates.source}\`. If the path is correct, please check your \`build.templates.filetypes\` config setting.`)
  }

  // const nunjucks = NunjucksEnvironment.init()

  await helpers.asyncForEach(templates, async file => {
    let html = await fs.readFile(file, 'utf8')
    const frontMatter = fm(html)
    const config = deepmerge(globalConfig, frontMatter.attributes)

    html = await render(html, {
      tailwind: {
        compiled: css
      },
      maizzle: {
        config: config
      },
      // nunjucks: nunjucks,
      env: env
    })

    const ext = config.build.destination.extension || 'html'

    fs.outputFile(file, html)
      .then(() => {
        if (config.plaintext) {
          const plaintext = stripHTML(html,
            {
              dumpLinkHrefsNearby: {
                enabled: true,
                putOnNewLine: true,
                wrapHeads: '[',
                wrapTails: ']'
              }
            })

          const filepath = config.permalink || file
          const plaintextPath = path.join(path.dirname(filepath), path.basename(filepath, path.extname(filepath)) + '.txt')

          fs.outputFileSync(plaintextPath, plaintext)
        }

        if (config.permalink) {
          return fs.move(file, config.permalink, { overwrite: true })
        }

        const parts = path.parse(file)
        fs.rename(file, `${parts.dir}/${parts.name}.${ext}`)
      })
  })

  if (fs.pathExistsSync(globalConfig.build.assets.source)) {
    await fs.copy(globalConfig.build.assets.source, `${outputDir}/${globalConfig.build.assets.destination}`)
  }

  return templates.length
}

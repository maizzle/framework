const path = require('path')
const fs = require('fs-extra')
const marked = require('marked')
const fm = require('front-matter')
const glob = require('glob-promise')
const deepmerge = require('deepmerge')
const helpers = require('../../utils/helpers')
const stripHTML = require('string-strip-html')
const NunjucksEnvironment = require('../../nunjucks')

const posthtml = require('posthtml')
const posthtmlContent = require('posthtml-content')

const Config = require('../config')
const Tailwind = require('../tailwind')
const Transformers = require('../../transformers')

module.exports = async (env, spinner) => {

  const nunjucks = NunjucksEnvironment.init()
  const globalConfig = await Config.getMerged(env).catch(err => { spinner.fail('Build failed'); console.log(err); process.exit() })
  const css = await Tailwind.fromFile(globalConfig, env).catch(err => { spinner.fail('Build failed'); console.log(err); process.exit() })
  const outputDir = path.resolve(`${globalConfig.build.destination.path}`)

  await fs.remove(outputDir)
  await fs.copy(globalConfig.build.templates.source, outputDir)

  if (fs.pathExistsSync(globalConfig.build.assets.source)) {
    await fs.copy(globalConfig.build.assets.source, `${outputDir}/${globalConfig.build.assets.destination}`)
  }

  let templates = await glob(`${outputDir}/**/*.+(${globalConfig.build.templates.filetypes || 'html|njk|nunjucks'})`)

  if (templates.length < 1) {
    throw `No "${globalConfig.build.templates.filetypes}" templates found in \`${globalConfig.build.templates.source}\`. If the path is correct, please check your \`build.templates.filetypes\` config setting.`        // return `No "${globalConfig.build.templates.filetypes}" templates found in \`${globalConfig.build.templates.source}\`. If the path is correct, please check your \`build.templates.filetypes\` config setting.`
  }

  if (env == 'local') {
    await fs.outputFile(`${outputDir}/css/${globalConfig.build.tailwind.css}`, css)
  }

  await helpers.asyncForEach(templates, async file => {

    let html = await fs.readFile(file, 'utf8')
    let frontMatter = fm(html)
    let config = deepmerge(globalConfig, frontMatter.attributes)
    let layout = config.layout || config.build.layout

    marked.setOptions({
      renderer: new marked.Renderer(),
      ...config.markdown
    })

    html = `{% extends "${layout}" %}\n${frontMatter.body}`
    html = nunjucks.renderString(html, { page: config, env: env, css: css })

    html = await posthtml([
      posthtmlContent({
        tailwind: css => Tailwind.fromString(css, html, false)
      })
    ]).process(html).then(res => res.html)

    if (!html) {
      throw Error(`Could not render HTML for ${file}`)
    }

    html = await Transformers.process(html, config, env)

    let ext = config.build.destination.extension || 'html'

    fs.outputFile(file, html)
      .then(() => {
        if (config.plaintext) {
          let plaintext = stripHTML(html,
          {
            dumpLinkHrefsNearby: {
              enabled: true,
              putOnNewLine: true,
              wrapHeads: '[',
              wrapTails: ']',
            }
          })

          let filepath = config.permalink || file
          let plaintextPath = path.join(path.dirname(filepath), path.basename(filepath, path.extname(filepath)) + '.txt')

          fs.outputFileSync(plaintextPath, plaintext);
        }

        if (config.permalink) {
          return fs.move(file, config.permalink, { overwrite: true })
        }

        const parts = path.parse(file)
        fs.rename(file, `${parts.dir}/${parts.name}.${ext}`)
      })

  })

  return templates.length
}

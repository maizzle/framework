const path = require('path')
const fs = require('fs-extra')
const glob = require('glob-promise')
const {get, isEmpty, merge} = require('lodash')
const {asyncForEach} = require('../../utils/helpers')
const removePlaintextTags = require('../../transformers/plaintext')

const Config = require('../config')
const Tailwind = require('../tailwindcss')
const Plaintext = require('../plaintext')

const render = require('./to-string')

module.exports = async (env, spinner, config) => {
  process.env.NODE_ENV = env || 'local'

  if (isEmpty(config)) {
    config = await Config.getMerged(env).catch(error => {
      spinner.fail('Build failed')
      throw error
    })
  }

  const buildTemplates = get(config, 'build.templates')
  const templatesConfig = Array.isArray(buildTemplates) ? buildTemplates : [buildTemplates]

  const parsed = []
  let files = []

  const css = (typeof get(config, 'tailwind.compiled') === 'string')
    ? config.tailwind.compiled
    : await Tailwind.compile('@tailwind components; @tailwind utilities;', '', {}, config, spinner)

  // Parse each template config object
  await asyncForEach(templatesConfig, async templateConfig => {
    const outputDir = get(templateConfig, 'destination.path', `build_${env}`)

    await fs.remove(outputDir)

    /**
     * Get all files in the template config's source directory
     * Supports `source` defined as:
     * - string
     * - array of strings
     * - function that returns either of the above
     *
     *  */
    const templateSource = []

    if (typeof templateConfig.source === 'function') {
      const sources = templateConfig.source()
      if (Array.isArray(sources)) {
        templateSource.push(...sources)
      } else {
        templateSource.push(sources)
      }
    } else {
      if (Array.isArray(templateConfig.source)) {
        templateSource.push(...templateConfig.source)
      } else {
        templateSource.push(templateConfig.source)
      }
    }

    // Parse each template source
    await asyncForEach(templateSource, async source => {
      await fs
        .copy(source, outputDir)
        .then(async () => {
          const extensions = Array.isArray(templateConfig.filetypes)
            ? templateConfig.filetypes.join('|')
            : templateConfig.filetypes || get(templateConfig, 'filetypes', 'html')

          const templates = await glob(`${outputDir}/**/*.+(${extensions})`)

          if (templates.length === 0) {
            spinner.warn(`Error: no files with the .${extensions} extension found in ${templateConfig.source}`)
            return
          }

          // Store template config currently being processed
          config.build.currentTemplates = templateConfig

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

                /**
                 * Generate plaintext
                 *
                 * We do this first so that we can remove the <plaintext>
                 * tags from the markup before outputting the file.
                 */

                const plaintextConfig = get(templateConfig, 'plaintext')
                const plaintextDestination = get(plaintextConfig, 'destination', config.permalink || file)

                if ((typeof plaintextConfig === 'boolean' && plaintextConfig) || !isEmpty(plaintextConfig)) {
                  await Plaintext
                    .generate(html, plaintextDestination, merge(config, {filepath: file}))
                    .then(({plaintext, destination}) => fs.outputFile(destination, plaintext))
                }

                html = removePlaintextTags(html, config)

                /**
                 * Output file
                 */
                const parts = path.parse(destination)
                const extension = get(templateConfig, 'destination.extension', 'html')
                const finalDestination = `${parts.dir}/${parts.name}.${extension}`

                await fs.outputFile(finalDestination, html)
                  .then(async () => {
                    /**
                     * Remove original file if its path is different
                     * from the final destination path.
                     *
                     * This ensures non-HTML files do not pollute
                     * the build destination folder.
                     */
                    if (finalDestination !== file) {
                      await fs.remove(file)
                    }

                    // Keep track of handled files
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

          const assets = {source: '', destination: 'assets', ...get(templateConfig, 'assets')}

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
  })

  if (config.events && typeof config.events.afterBuild === 'function') {
    await config.events.afterBuild(files)
  }

  return {
    files,
    parsed,
    css
  }
}

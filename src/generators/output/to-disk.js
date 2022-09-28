const path = require('path')
const fs = require('fs-extra')
const glob = require('glob-promise')
const {get, isEmpty, merge} = require('lodash')
const {asyncForEach} = require('../../utils/helpers')

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
    : await Tailwind.compile('', '', {}, config, spinner)

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
    const templateTypeErrorMessage = 'Invalid template source: expected string or array of strings, got '

    if (typeof templateConfig.source === 'function') {
      const sources = templateConfig.source(config)

      if (Array.isArray(sources)) {
        templateSource.push(...sources)
      } else if (typeof sources === 'string') {
        templateSource.push(sources)
      } else {
        throw new TypeError(templateTypeErrorMessage + typeof sources)
      }
    } else {
      if (Array.isArray(templateConfig.source)) {
        templateSource.push(...templateConfig.source)
      } else if (typeof templateConfig.source === 'string') {
        templateSource.push(templateConfig.source)
      } else {
        throw new TypeError(templateTypeErrorMessage + typeof templateConfig.source)
      }
    }

    // Parse each template source
    await asyncForEach(templateSource, async source => {
      /**
       * Copy single-file sources correctly
       * If `src` is a file, `dest` cannot be a directory
       * https://github.com/jprichardson/node-fs-extra/issues/323
       */
      const out = fs.lstatSync(source).isFile() ? `${outputDir}/${path.basename(source)}` : outputDir

      await fs
        .copy(source, out)
        .then(async () => {
          const extensions = Array.isArray(templateConfig.filetypes)
            ? templateConfig.filetypes.join('|')
            : templateConfig.filetypes || get(templateConfig, 'filetypes', 'html')

          const templates = await glob(`${outputDir}/**/*.+(${extensions})`)

          if (templates.length === 0) {
            spinner.warn(`Error: no files with the .${extensions} extension found in ${templateConfig.source}`)
            return
          }

          if (config.events && typeof config.events.beforeCreate === 'function') {
            await config.events.beforeCreate(config)
          }

          await asyncForEach(templates, async file => {
            config.build.current = {
              path: path.parse(file)
            }

            const html = await fs.readFile(file, 'utf8')

            try {
              const compiled = await render(html, {
                maizzle: {
                  ...config,
                  env
                },
                tailwind: {
                  compiled: css
                },
                ...config.events
              })

              const destination = config.permalink || file

              /**
               * Generate plaintext
               *
               * We do this first so that we can remove the <plaintext>
               * tags from the markup before outputting the file.
               */

              // Check if plaintext: true globally, fallback to template's front matter
              const plaintextConfig = get(templateConfig, 'plaintext', get(compiled.config, 'plaintext', false))
              const plaintextPath = get(plaintextConfig, 'destination.path', config.permalink || file)

              if (Boolean(plaintextConfig) || !isEmpty(plaintextConfig)) {
                await Plaintext
                  .generate(
                    compiled.html,
                    plaintextPath,
                    merge(plaintextConfig, {filepath: file})
                  )
                  .then(async ({html, plaintext, destination}) => {
                    compiled.html = html
                    await fs.outputFile(destination, plaintext)
                  })
              }

              /**
               * Output file
               */
              const parts = path.parse(destination)
              const extension = get(templateConfig, 'destination.extension', 'html')
              const finalDestination = `${parts.dir}/${parts.name}.${extension}`

              await fs.outputFile(finalDestination, compiled.html)

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
            } catch (error) {
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
            }
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

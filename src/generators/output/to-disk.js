const path = require('path')
const fs = require('fs-extra')
const {glob} = require('fast-glob')
const {get, merge, isEmpty} = require('lodash')

const Config = require('../config')
const Plaintext = require('../plaintext')
const Tailwind = require('../tailwindcss')

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

  const css = (typeof get(config, 'build.tailwind.compiled') === 'string')
    ? config.build.tailwind.compiled
    : await Tailwind.compile({config})

  // Parse each template config object
  for await (const templateConfig of templatesConfig) {
    if (!templateConfig) {
      const configFileName = env === 'local' ? 'config.js' : `config.${env}.js`
      throw new Error(`No template sources defined in \`build.templates\`, check your ${configFileName} file`)
    }

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

    // Create a pipe-delimited list of allowed extensions
    // We only compile these, the rest are copied as-is
    const fileTypes = get(templateConfig, 'filetypes', 'html')
    const extensionsList = Array.isArray(fileTypes)
      ? fileTypes.join(',')
      : fileTypes.split('|').join(',')

    // List of files that won't be copied to the output directory
    const omitted = Array.isArray(templateConfig.omit)
      ? templateConfig.omit
      : [get(templateConfig, 'omit', '')]

    // Parse each template source
    for await (const source of templateSource) {
      /**
       * Copy single-file sources correctly
       * If `src` is a file, `dest` cannot be a directory
       * https://github.com/jprichardson/node-fs-extra/issues/323
       */
      const out = fs.lstatSync(source).isFile()
        ? `${outputDir}/${path.basename(source)}`
        : outputDir

      await fs
        .copy(source, out, {filter: file => {
          // Do not copy omitted files
          return !omitted
            .filter(Boolean)
            .some(omit => path.normalize(file).includes(path.normalize(omit)))
        }})
        .then(async () => {
          const extensions = extensionsList.includes(',')
            ? `{${extensionsList}}`
            : extensionsList
          const allSourceFiles = await glob(`${outputDir}/**/*.${extensions}`)

          const skipped = Array.isArray(templateConfig.skip) ?
            templateConfig.skip :
            [get(templateConfig, 'skip', '')]

          const templates = allSourceFiles.filter(template => {
            return !skipped.includes(template.replace(`${outputDir}/`, ''))
          })

          if (templates.length === 0) {
            spinner.warn(`Error: no files with the .${extensions} extension found in ${templateConfig.source}`)
            return
          }

          if (config.events && typeof config.events.beforeCreate === 'function') {
            await config.events.beforeCreate(config)
          }

          for await (const file of templates) {
            config.build.current = {
              path: path.parse(file)
            }

            const html = await fs.readFile(file, 'utf8')

            try {
              const compiled = await render(html, {
                useFileConfig: true,
                maizzle: {
                  ...config,
                  env
                },
                tailwind: {
                  compiled: css
                },
                ...config.events
              })

              const destination = get(compiled, 'config.permalink', file)

              /**
               * Generate plaintext
               *
               * We do this first so that we can remove the <plaintext>
               * tags from the markup before outputting the file.
               */

              // Check if plaintext: true globally, fallback to template's front matter
              const plaintextConfig = get(templateConfig, 'plaintext', get(compiled.config, 'plaintext', false))
              const plaintextPath = get(plaintextConfig, 'destination.path', destination)

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
          }

          const assets = Array.isArray(get(templateConfig, 'assets'))
            ? get(templateConfig, 'assets')
            : [{ source: '', destination: 'assets', ...get(templateConfig, 'assets') }]

          for await (let asset of assets) {
            if (Array.isArray(asset.source)) {
              for await (const source of asset.source) {
                if (fs.existsSync(source)) {
                  await fs
                    .copy(source, path.join(templateConfig.destination.path, asset.destination))
                    .catch(error => spinner.warn(error.message))
                }
              }
            } else {
              if (fs.existsSync(asset.source)) {
                await fs
                  .copy(asset.source, path.join(templateConfig.destination.path, asset.destination))
                  .catch(error => spinner.warn(error.message))
              }
            }
          }

          await glob(path.join(templateConfig.destination.path, '/**').replace(/\\/g, '/'))
            .then(contents => {
              files = [...new Set([...files, ...contents])]
            })
        })
        .catch(error => spinner.warn(error.message))
    }
  }

  if (config.events && typeof config.events.afterBuild === 'function') {
    await config.events.afterBuild(files, config)
  }

  return {
    files,
    parsed,
    css
  }
}

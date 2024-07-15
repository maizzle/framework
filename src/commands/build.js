import {
  readFile,
  writeFile,
  copyFile,
  lstat,
  mkdir,
  rm
} from 'node:fs/promises'
import path from 'pathe'
import fg from 'fast-glob'
import { defu as merge } from 'defu'

import get from 'lodash/get.js'
import isEmpty from 'lodash-es/isEmpty.js'
import { isBinary } from 'istextorbinary'

import ora from 'ora'
import pico from 'picocolors'
import cliTable from 'cli-table3'

import { render } from '../generators/render.js'
import { formatTime } from '../utils/string.js'
import { getColorizedFileSize } from '../utils/node.js'
import { readFileConfig } from '../utils/getConfigByFilePath.js'
import {
  generatePlaintext,
  handlePlaintextTags,
  writePlaintextFile
} from '../generators/plaintext.js'

/**
 * Compile templates and output to the build directory.
 * Returns a promise containing an object with files output and the config object.
 *
 * @param {object|string} config - The Maizzle config object, or path to a config file.
 * @returns {Promise<object>} The build output, containing the  files and config.
 */
export default async (config = {}) => {
  const spinner = ora()

  try {
    const startTime = Date.now()

    // Compute config
    config = await readFileConfig(config).catch(() => { throw new Error('Could not compute config') })

    /**
     * Support customizing the spinner
     */
    const spinnerConfig = get(config, 'build.spinner')

    if (spinnerConfig === false) {
      // Show only 'Building...' text
      spinner.isEnabled = false
    } else {
      spinner.spinner = get(config, 'build.spinner', 'circleHalves')
    }

    spinner.start('Building...')

    // Run beforeCreate event
    if (typeof config.beforeCreate === 'function') {
      await config.beforeCreate({ config })
    }

    const buildOutputPath = get(config, 'build.output.path', 'build_local')

    // Remove output directory
    await rm(buildOutputPath, { recursive: true, force: true })

    const table = new cliTable({
      head: ['File name', 'File size', 'Build time'].map(item => pico.bold(item)),
    })

    // Determine paths of templates to build
    const userFilePaths = get(config, 'build.content', 'src/templates/**/*.html')
    const templateFolders = Array.isArray(userFilePaths) ? userFilePaths : [userFilePaths]
    const templatePaths = await fg.glob([...new Set(templateFolders)])

    // If there are no templates to build, throw error
    if (templatePaths.length === 0) {
      throw new Error(`No templates found in ${pico.inverse(templateFolders)}`)
    }

    const baseDirs = templateFolders.filter(p => !p.startsWith('!')).map(p => {
      const parts = p.split('/')
      // remove the glob part (e.g., **/*.html):
      return parts.filter(part => !part.includes('*')).join('/')
    })

    /**
     * Check for binary files
     *
     * We store paths to binary files in a separate array, because we don't want
     * to render them. These files will be treated as static files and will
     * be copied directly to the output directory, just like the
     * `build.static` folders.
     */
    const binaryPaths = await fg.glob([...new Set(baseDirs.map(base => `${base}/**/*.*`))])
      .then(paths => paths.filter(file => isBinary(file)))

    /**
     * Render templates
     *
     * Render each template and write the output to the output directory,
     * preserving the relative path.
     */
    for await (const templatePath of templatePaths) {
      const templateBuildStartTime = Date.now()

      // Determine the base directory the template belongs to
      const baseDir = baseDirs.find(base => templatePath.startsWith(base))

      // Compute the relative path
      const relativePath = path.relative(baseDir, templatePath)

      /**
       * Add the current template path to the config
       *
       * Can be used in events like `beforeRender` to determine
       * which template file is being rendered.
       */
      config.build.current = {
        path: path.parse(templatePath),
        baseDir,
        relativePath,
      }

      const html = await readFile(templatePath, 'utf8')

      const rendered = await render(html, config)

      /**
       * Generate plaintext
       *
       * We do this first so that we can remove the <plaintext>
       * tags from the markup before outputting the file.
       */
      const plaintextConfig = get(rendered.config, 'plaintext')

      if (Boolean(plaintextConfig) || !isEmpty(plaintextConfig)) {
        const posthtmlOptions = get(rendered.config, 'posthtml.options', {})

        const plaintext = await generatePlaintext(rendered.html, merge(plaintextConfig, posthtmlOptions))
        rendered.html = await handlePlaintextTags(rendered.html, posthtmlOptions)
        await writePlaintextFile(plaintext, rendered.config)
          .catch(error => {
            throw new Error(`Error writing plaintext file: ${error}`)
          })
      }

      /**
       * Determine output path, creating directories if needed
       *
       * Prioritize `permalink` path from Front Matter,
       * fallback to the current template path.
       *
       * We do this before generating plaintext, so that
       * any paths will already have been created.
       */
      const outputPathFromConfig = get(rendered.config, 'permalink', path.join(buildOutputPath, relativePath))
      const parsedOutputPath = path.parse(outputPathFromConfig)
      const extension = get(rendered.config, 'build.output.extension', parsedOutputPath.ext.slice(1))
      const outputPath = `${parsedOutputPath.dir}/${parsedOutputPath.name}.${extension}`

      const pathExists = await lstat(path.dirname(outputPath)).catch(() => false)

      if (!pathExists) {
        await mkdir(path.dirname(outputPath), { recursive: true })
      }

      /**
       * Write the rendered HTML to disk, creating directories if needed
       */
      await writeFile(outputPath, rendered.html)

      /**
       * Add file to CLI table for build summary logging
       */
      if (config.build.summary) {
        table.push([
          path.relative(get(rendered.config, 'build.output.path'), outputPath),
          getColorizedFileSize(rendered.html),
          formatTime(Date.now() - templateBuildStartTime)
        ])
      }
    }

    /**
     * Copy static files
     *
     * Copy binary files that are alongside templates as well as
     * files from `build.static`, to the output directory.
     *
     * TODO: support an array of objects with source and destination, i.e. static: [{ source: 'src/assets', destination: 'assets' }, ...]
     */

    // Copy binary files that are alongside templates
    for await (const binaryPath of binaryPaths) {
      const relativePath = path.relative(get(config, 'build.current.baseDir'), binaryPath)
      const outputPath = path.join(get(config, 'build.output.path'), get(config, 'build.static.destination'), relativePath)

      await mkdir(path.dirname(outputPath), { recursive: true })
      await copyFile(binaryPath, outputPath)
    }

    // Copy files from `build.static`
    const staticSourcePaths = await fg.glob([...new Set(get(config, 'build.static.source', []))])
      .then(paths => paths.filter(file => isBinary(file)))

    if (!isEmpty(staticSourcePaths)) {
      for await (const staticPath of staticSourcePaths) {
        const relativePath = path.relative(get(config, 'build.current.baseDir'), staticPath)
        const outputPath = path.join(get(config, 'build.output.path'), get(config, 'build.static.destination'), relativePath)

        await mkdir(path.dirname(outputPath), { recursive: true })
        await copyFile(staticPath, outputPath)
      }
    }

    const compiledFiles = await fg.glob(path.join(config.build.output.path, '**/*'))

    /**
     * Run `afterBuild` event
     */
    if (typeof config.afterBuild === 'function') {
      await config.afterBuild({ files: compiledFiles, config, render })
    }

    /**
     * Log a build summary if enabled in the config
     *
     * Need to first clear the spinner
     */

    spinner.clear()

    if (config.build.summary) {
      console.log(table.toString() + '\n')
    }

    spinner.succeed(`Build completed in ${formatTime(Date.now() - startTime)}`)

    return {
      files: compiledFiles,
      config
    }
  } catch (error) {
    spinner.fail('Build failed')
    throw error
  }
}

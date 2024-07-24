import {
  readFile,
  writeFile,
  lstat,
  mkdir,
  rm,
  cp,
} from 'node:fs/promises'
import path from 'pathe'
import fg from 'fast-glob'
import { defu as merge } from 'defu'

import get from 'lodash/get.js'
import isEmpty from 'lodash-es/isEmpty.js'

import ora from 'ora'
import pico from 'picocolors'
import cliTable from 'cli-table3'

import { render } from '../generators/render.js'

import {
  formatTime,
  getRootDirectories,
  getFileExtensionsFromPattern,
} from '../utils/string.js'

import { getColorizedFileSize } from '../utils/node.js'

import {
  generatePlaintext,
  handlePlaintextTags,
  writePlaintextFile
} from '../generators/plaintext.js'

import { readFileConfig } from '../utils/getConfigByFilePath.js'

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

    /**
     * Determine paths to handle
     *
     * 1. Resolve globs in `build.content` to folders that should be copied over to `build.output.path`
     * 2. Check that templates to be built, actually exist
     */
    const contentPaths = get(config, 'build.content', 'src/templates/**/*.html')

    // 1. Resolve globs in `build.content` to folders that should be copied over to `build.output.path`
    const rootDirs = await getRootDirectories(contentPaths)

    // 2. Check that templates to be built, actually exist
    const templateFolders = Array.isArray(contentPaths) ? contentPaths : [contentPaths]
    const templatePaths = await fg.glob([...new Set(templateFolders)])

    // If there are no templates to build, throw error
    if (templatePaths.length === 0) {
      throw new Error(`No templates found in ${pico.inverse(templateFolders)}`)
    }

    /**
     * Copy source directories to destination
     *
     * Copies each `build.content` path to the `build.output.path` directory.
     */
    for await (const rootDir of rootDirs) {
      await cp(rootDir, buildOutputPath, { recursive: true })
    }

    /**
     * Get a list of files to render, from the output directory
     *
     * Uses all file extensions from non-negated glob paths in `build.content`
     * to determine which files to render from the output directory.
     */
    const outputExtensions = new Set()

    for (const pattern of contentPaths) {
      outputExtensions.add(...getFileExtensionsFromPattern(pattern))
    }

    /**
     * Create a list of templates to compile
     */
    const extensions = outputExtensions.size > 1 ? `{${[...outputExtensions].join(',')}}` : 'html'

    const templatesToCompile = await fg.glob(
      path.join(
        buildOutputPath,
        `**/*.${extensions}`
      )
    )

    /**
     * Render templates
     */
    for await (const templatePath of templatesToCompile) {
      const templateBuildStartTime = Date.now()

      /**
       * Add the current template path to the config
       *
       * Can be used in events like `beforeRender` to determine
       * which template file is being rendered.
       */
      config.build.current = {
        path: path.parse(templatePath),
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
      const outputPathFromConfig = get(rendered.config, 'permalink', templatePath)
      const parsedOutputPath = path.parse(outputPathFromConfig)
      // This keeps original file extension if no output extension is set
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
       * Remove original file if its path is different
       * from the final destination path.
       */
      if (outputPath !== templatePath) {
        await rm(templatePath)
      }

      /**
       * Add file to CLI table for build summary logging
       */
      table.push([
        path.relative(get(rendered.config, 'build.output.path'), outputPath),
        getColorizedFileSize(rendered.html),
        formatTime(Date.now() - templateBuildStartTime)
      ])
    }

    /**
     * Copy static files
     *
     * TODO: support an array of objects with source and destination,
     * i.e. static: [{ source: 'src/assets', destination: 'assets' }, ...]
     */
    const staticSourcePaths = getRootDirectories([...new Set(get(config, 'build.static.source', []))])

    for await (const rootDir of staticSourcePaths) {
      await cp(rootDir, path.join(buildOutputPath, get(config, 'build.static.destination')), { recursive: true })
    }

    const allOutputFiles = await fg.glob(path.join(buildOutputPath, '**/*'))

    /**
     * Run `afterBuild` event
     */
    if (typeof config.afterBuild === 'function') {
      await config.afterBuild({
        config,
        files: allOutputFiles,
      })
    }

    /**
     * Log a build summary if enabled in the config
     */

    spinner.clear()

    if (config.build.summary) {
      console.log(table.toString() + '\n')
    }

    spinner.succeed(`Built ${table.length} template${table.length > 1 ? 's' : ''} in ${formatTime(Date.now() - startTime)}`)

    return {
      files: allOutputFiles,
      config
    }
  } catch (error) {
    spinner.fail('Build failed')
    throw error
  }
}

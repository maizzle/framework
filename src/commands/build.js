import {
  readFile,
  writeFile,
  copyFile,
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
 * Ensures that a directory exists, creating it if needed.
 *
 * @param {string} filePath - The path to the file to check.
 */
async function ensureDirectoryExistence(filePath) {
  const dirname = path.dirname(filePath)
  await mkdir(dirname, { recursive: true })
}

/**
 * Copy a file from source to target.
 *
 * @param {string} source - The source file path.
 * @param {string} target - The target file path.
 */
async function copyFileAsync(source, target) {
  await ensureDirectoryExistence(target)
  await copyFile(source, target)
}

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

    /**
     * Read the config file for this environment,
     * merging it with the default config.
     */
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
     * Check that templates to be built, actually exist
     */
    const contentPaths = get(config, 'build.content', ['emails/**/*.html'])

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
    let from = get(config, 'build.output.from', ['emails'])

    const globPathsToCopy = contentPaths.map(glob => {
      // Keep negated paths as they are
      if (glob.startsWith('!')) {
        return glob
      }

      // Keep single-file sources as they are
      if (!/\*/.test(glob)) {
        return glob
      }

      // Update non-negated paths to target all files, avoiding duplication
      return glob.replace(/\/\*\*\/\*\.\{.*?\}$|\/\*\*\/\*\.[^/]*$|\/*\.[^/]*$/, '/**/*')
    })

    try {
      from = Array.isArray(from) ? from : [from]

      /**
       * Copy files from source to destination
       *
       * The array/set conversion is to remove duplicates
       */
      for (const file of await fg(Array.from(new Set(globPathsToCopy)))) {
        let relativePath
        for (const dir of from) {
          if (file.startsWith(dir)) {
            relativePath = path.relative(dir, file)
            break
          }
        }
        if (!relativePath) {
          relativePath = path.relative('.', file)
        }

        const targetPath = path.join(buildOutputPath, relativePath)
        await copyFileAsync(file, targetPath)
      }
    } catch (error) {
      console.error('Error while processing pattern:', error)
    }

    /**
     * Get a list of files to render, from the output directory
     *
     * Uses all file extensions from non-negated glob paths in `build.content`
     * to determine which files to render from the output directory.
     */
    const outputExtensions = new Set()

    for (const pattern of contentPaths) {
      getFileExtensionsFromPattern(pattern).map(ext => outputExtensions.add(ext))
    }

    /**
     * Create a list of templates to compile
     */
    const extensions = outputExtensions.size > 1
      ? `{${[...outputExtensions].join(',')}}`
      : [...outputExtensions][0] || 'html'

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

      /**
       * Render the markup.
       *
       * Merging a custom `components` object to make sure that file extensions from both
       * `build.content` * and * `components.fileExtension` are used when scanning for
       * component files.
       */
      const userComponentFileExtensions = get(config, 'components.fileExtension', ['html'])

      const rendered = await render(html, merge(
        {
          components: {
            fileExtension: [
              ...outputExtensions,
              ...(new Set([].concat(userComponentFileExtensions))),
            ],
          }
        },
        config
      ))

      /**
       * Generate plaintext
       *
       * We do this first so that we can remove the <plaintext>
       * tags from the markup before outputting the file.
       */
      const plaintextConfig = get(rendered.config, 'plaintext')

      if (Boolean(plaintextConfig) || !isEmpty(plaintextConfig)) {
        const posthtmlOptions = get(rendered.config, 'posthtml.options', {})

        await writePlaintextFile(
          await generatePlaintext(rendered.html, merge(plaintextConfig, posthtmlOptions)),
          rendered.config
        ).catch(error => {
          throw new Error(`Error writing plaintext file: ${error}`)
        })

        rendered.html = await handlePlaintextTags(rendered.html, posthtmlOptions)
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
     */
    let staticFiles = get(config, 'build.static', [])

    if (!Array.isArray(staticFiles)) {
        staticFiles = [staticFiles]
    }

    for (const definition of staticFiles) {
      const staticSourcePaths = getRootDirectories([...new Set(definition.source)])

      for await (const rootDir of staticSourcePaths) {
        await cp(rootDir, path.join(buildOutputPath, definition.destination), { recursive: true })
      }
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

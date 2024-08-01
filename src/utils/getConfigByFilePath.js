import { resolve } from 'pathe'
import get from 'lodash/get.js'
import { defu as merge } from 'defu'
import { lstat } from 'node:fs/promises'
import isEmpty from 'lodash-es/isEmpty.js'

/**
 * Compute the Maizzle config object.
 *
 * If a config file path is provided, that file will be read
 * instead of trying to merge the base and environment configs.
 *
 * If an environment is provided, the config object will be
 * computed based on a base config and the resolved
 * environment config.
 *
 * @param {string} env - The environment name to use.
 * @param {string} path - The path to the config file to use.
 * @returns {Promise<object>} The computed config object.
 */
export async function readFileConfig(config) {
  try {
    /**
     * If `config` is string, try to read and return
     * the config object from it.
     */
    if (typeof config === 'string' && config) {
      const { default: resolvedConfig } = await import(`file://${resolve(config)}?d=${Date.now()}`)
        .catch(() => { throw new Error('Could not read config file') })

      return merge(resolvedConfig, { env: config })
    }

    /**
     * Otherwise, default to the Environment config approach,
     * where we check for config files that follow a
     * specific naming convention.
     *
     * First, we check for a base config file, in this order:
     */
    const baseConfigFileNames = [
      './maizzle.config.js',
      './maizzle.config.local.js',
      './config.js',
      './config.local.js',
      './maizzle.config.cjs',
      './maizzle.config.local.cjs',
      './config.cjs',
      './config.local.cjs',
    ]

    const env = get(config, 'env', 'local')
    let baseConfig = merge({ env }, config)
    let envConfig = merge({ env }, config)

    const cwd = env === 'maizzle-ci' ? './test/stubs/config' : process.cwd()

    // We load the first base config found
    for (const module of baseConfigFileNames) {
      // Check if the file exists, go to next one if not
      const configFileExists = await lstat(resolve(cwd, module)).catch(() => false)

      if (!configFileExists) {
        continue
      }

      // Load the config file
      try {
        const { default: baseConfigFile } = await import(`file://${resolve(cwd, module)}?d=${Date.now()}`)

        // Use the first base config found
        if (!isEmpty(baseConfigFile)) {
          baseConfig = merge(baseConfigFile, baseConfig)
          break
        }
      } catch (error) {
        break
      }

    }

    // Then, we load and compute the first Environment config found
    if (env !== 'local') {
      let loaded = false
      const modulesToTry = [
        `./maizzle.config.${env}.js`,
        `./config.${env}.js`,
        `./maizzle.config.${env}.cjs`,
        `./config.${env}.cjs`,
      ]

      for (const module of modulesToTry) {
        // Check if the file exists, go to next one if not
        const configFileExists = await lstat(resolve(cwd, module)).catch(() => false)

        if (!configFileExists) {
          continue
        }

        // Load the config file
        try {
          const { default: envConfigFile } = await import(`file://${resolve(cwd, module)}?d=${Date.now()}`)

          // If it's not an empty object, merge it with the base config
          if (!isEmpty(envConfigFile)) {
            envConfig = merge(envConfigFile, envConfig)
            loaded = true
            break
          }
        } catch (error) {
          break
        }
      }

      if (!loaded) {
        throw new Error(`Failed to load the \`${env}\` environment config, do you have one of these files in your project root?\n\n${modulesToTry.join('\n')}`)
      }
    }

    return merge(envConfig, baseConfig)
  } catch (error) {
    throw new Error('Could not compute config')
  }
}

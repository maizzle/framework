const path = require('node:path')
const {merge} = require('lodash')
const {requireUncached} = require('../utils/helpers')

const baseConfigFileNames = [
  './maizzle.config.js',
  './maizzle.config.cjs',
  './maizzle.config.local.js',
  './maizzle.config.local.cjs',
  './config.js',
  './config.cjs',
  './config.local.js',
  './config.local.cjs'
]

module.exports = {
  getMerged: async (env = 'local') => {
    if (typeof env !== 'string') {
      throw new TypeError(`env name must be a string, received ${typeof env}(${env})`)
    }

    let baseConfig = {env}
    let envConfig = {env}

    const cwd = ['maizzle-ci', 'test'].includes(env) ? './test/stubs/config' : process.cwd()

    for (const module of baseConfigFileNames) {
      try {
        baseConfig = merge(baseConfig, requireUncached(path.resolve(cwd, module)))
      } catch {}
    }

    if (env !== 'local') {
      let loaded = false
      const modulesToTry = [`./maizzle.config.${env}.js`, `./maizzle.config.${env}.cjs`, `./config.${env}.js`, `./config.${env}.cjs`]

      for (const module of modulesToTry) {
        try {
          envConfig = merge(envConfig, requireUncached(path.resolve(cwd, module)))
          loaded = true
          break
        } catch {}
      }

      if (!loaded) {
        throw new Error(`Failed to load config file for \`${env}\` environment, do you have one of these files in your project root?\n\n${modulesToTry.join('\n')}`)
      }
    }

    return merge(baseConfig, envConfig)
  }
}

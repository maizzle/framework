const path = require('path')
const {merge} = require('lodash')
const {requireUncached} = require('../utils/helpers')

module.exports = {
  getMerged: async (env = 'local') => {
    if (typeof env !== 'string') {
      throw new TypeError(`env name must be a string, received ${typeof env}(${env})`)
    }

    let baseConfig = {env}
    let envConfig = {env}

    const cwd = env === 'maizzle-ci' ? './test/stubs/config' : process.cwd()

    for (const module of ['./config', './config.cjs', './config.local', './config.local.cjs']) {
      try {
        baseConfig = merge(baseConfig, requireUncached(path.resolve(cwd, module)))
      } catch {}
    }

    if (typeof env === 'string' && env !== 'local') {
      let loaded = false
      for (const module of [`./config.${env}`, `./config.${env}.cjs`]) {
        try {
          envConfig = merge(envConfig, requireUncached(path.resolve(cwd, module)))
          loaded = true
          break
        } catch {}
      }

      if (!loaded) {
        throw new Error(`could not load config.${env}.js`)
      }
    }

    return merge(baseConfig, envConfig)
  }
}

const path = require('path')
const {merge} = require('lodash')

module.exports = {
  getMerged: async (env = 'local') => {
    if (typeof env !== 'string') {
      throw new TypeError(`env name must be a string, received ${env}`)
    }

    let baseConfig = {env}
    let envConfig = {env}

    for (const module of ['./config', './config.local']) {
      try {
        baseConfig = require(path.resolve(process.cwd(), module))
      } catch {}
    }

    if (typeof env === 'string' && env !== 'local') {
      try {
        envConfig = require(path.resolve(process.cwd(), `./config.${env}`))
      } catch {
        throw new Error(`could not load 'config.${env}.js'`)
      }
    }

    return merge(baseConfig, envConfig)
  }
}

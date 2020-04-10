const path = require('path')
const deepmerge = require('deepmerge')

module.exports = {
  getMerged: async env => {
    let baseConfig = {}
    let envConfig = {}

    for (const module of ['./config', './config.local']) {
      try {
        baseConfig = require(path.resolve(process.cwd(), module))
      } catch {}
    }

    if (typeof env === 'string' && env !== 'local') {
      try {
        envConfig = require(path.resolve(process.cwd(), `./config.${env}`))
      } catch (error) {
        if (error.code === 'MODULE_NOT_FOUND') {
          throw new Error(`no 'config.${env}.js' file found in project root`)
        }

        throw error
      }
    }

    return deepmerge(baseConfig, envConfig)
  }
}

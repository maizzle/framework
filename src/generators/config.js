const path = require('path')
const deepmerge = require('deepmerge')

module.exports = {
  getMerged: async env => {
    env = env === 'local' ? '' : `.${env}`
    let baseConfig
    let envConfig = {}

    try {
      baseConfig = require(path.resolve(process.cwd(), './config'))
    } catch (error) {
      throw error
    }

    if (env) {
      try {
        envConfig = require(path.resolve(process.cwd(), `./config${env}`))
      } catch (error) {
        if (error.code === 'MODULE_NOT_FOUND') {
          throw new Error(`no 'config${env}.js' file found`)
        }
      }
    }

    try {
      return deepmerge(baseConfig, envConfig)
    } catch (error) {
      throw error
    }
  }
}

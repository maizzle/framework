const path = require('path')
const deepmerge = require('deepmerge')

module.exports = {
  getMerged: async env => {
    env = env == 'local' ? '' : `.${env}`
    let baseConfig, envConfig = {}

    try {
      baseConfig = require(path.resolve(process.cwd(), './config'))
    }
    catch (err) {
      throw err
    }

    if (env) {
      try {
        envConfig = require(path.resolve(process.cwd(), `./config${env}`))
      } catch (error) {
        envConfig = {}
      }
    }

    try {
      return deepmerge(baseConfig, envConfig)
    }
    catch (err) {
      throw err
    }
  },
}

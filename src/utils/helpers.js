const readline = require('readline')

module.exports = {
  asyncForEach: async (array, callback) => {
    for (let index = 0; index < array.length; index++) {
      await callback(array[index], index, array) // eslint-disable-line
    }
  },
  requireUncached: module => {
    try {
      delete require.cache[require.resolve(module)]
      return require(module)
    } catch {
      throw new Error(`could not load ${module}`)
    }
  },
  clearConsole: () => {
    const blank = '\n'.repeat(process.stdout.rows)
    console.log(blank)
    readline.cursorTo(process.stdout, 0, 0)
    readline.clearScreenDown(process.stdout)
  }
}

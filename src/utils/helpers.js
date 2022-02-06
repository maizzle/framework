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
  // https://github.com/lukeed/console-clear
  clearConsole: () => process.stdout.write('\x1B[H\x1B[2J')
}

module.exports = {
  asyncForEach: async (array, callback) => {
    for (let index = 0; index < array.length; index++) {
      await callback(array[index], index, array) // eslint-disable-line
    }
  },
  isObject: object => typeof object === 'object' && object !== null,
  isEmptyObject: object => Object.entries(object).length === 0 && object.constructor === Object,
  getPropValue: (object, path = '') => path.split('.').reduce((o, x) => o === undefined ? o : o[x], object),
  requireUncached: module => {
    try {
      delete require.cache[require.resolve(module)]
      return require(module)
    } catch {
      return {}
    }
  }
}

module.exports = {
  asyncForEach: async function (array, callback) {
    for (let index = 0; index < array.length; index++) {
      await callback(array[index], index, array)
    }
  },
  isObject: obj => typeof obj === 'object' && obj !== null,
  isEmptyObject: obj => Object.entries(obj).length === 0 && obj.constructor === Object,
  getPropValue: (object, path = '') => path.split('.').reduce((o, x) => o === undefined ? o : o[x], object)
}

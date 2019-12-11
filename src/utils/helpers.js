module.exports = {
  asyncForEach: async function (array, callback) {
    for (let index = 0; index < array.length; index++) {
      await callback(array[index], index, array)
    }
  },
  isEmptyObject: obj => Object.entries(obj).length === 0 && obj.constructor === Object
}

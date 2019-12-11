module.exports = {
  asyncForEach: async function (array, callback) {
    for (let index = 0; index < array.length; index++) {
      await callback(array[index], index, array)
    }
  },
  flattenObject: obj => {
    return Object.assign({}, ...(function _flatten (o) { return [].concat(...Object.keys(o).map(k => typeof o[k] === 'object' ? _flatten(o[k]) : ({ [k]: o[k] }))) }(obj)))
  },
  isEmptyObject: obj => Object.entries(obj).length === 0 && obj.constructor === Object
}

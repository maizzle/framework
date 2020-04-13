const cheerio = require('cheerio')
const {isEmptyObject} = require('../utils/helpers')

module.exports = async (html, config) => {
  if (config.extraAttributes && !isEmptyObject(config.extraAttributes)) {
    const $ = cheerio.load(html, {decodeEntities: false})

    Object.entries(config.extraAttributes).forEach(([element, attrs]) => {
      Object.entries(attrs).forEach(attr => {
        const $element = $(element)
        const [name, value] = attr
        if (name === 'class') {
          return $element.addClass(value)
        }

        return $element.attr(name, value)
      })
    })

    return $.html()
  }

  return html
}

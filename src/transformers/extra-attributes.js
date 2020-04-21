const cheerio = require('cheerio')
const {isObject} = require('../utils/helpers')

module.exports = async (html, config) => {
  let attributes = {
    table: {
      cellpadding: 0,
      cellspacing: 0,
      role: 'presentation'
    },
    img: {
      alt: ''
    }
  }

  if (isObject(config.extraAttributes)) {
    attributes = {...attributes, ...config.extraAttributes}
  }

  const $ = cheerio.load(html, {decodeEntities: false})

  Object.entries(attributes).forEach(([element, attrs]) => {
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

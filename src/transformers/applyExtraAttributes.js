const cheerio = require('cheerio')

module.exports = async (html, config) => {
  if (config.applyExtraAttributes) {
    const $ = cheerio.load(html, { decodeEntities: false })

    Object.entries(config.applyExtraAttributes).map(([el, attrs]) => {
      if (el.length > 0) {
        Object.entries(attrs).forEach(attr => {
          const $el = $(el)
          const [name, value] = attr
          if (name === 'class') {
            return $el.addClass(value)
          }
          if (!$el.attr(name)) {
            return $el.attr(name, value)
          }
        })
      }
    })

    return $.html()
  }

  return html
}

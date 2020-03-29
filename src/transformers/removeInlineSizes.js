const cheerio = require('cheerio')

module.exports = async (html, config) => {
  if (config.keepOnlyAttributeSizes) {
    const $ = cheerio.load(html, { decodeEntities: false })
    Object.entries(config.keepOnlyAttributeSizes).map(([k, v]) => {
      v = Object.values(v)
      if (v.length > 0) {
        $(v).each((i, el) => {
          $(el).css(k, '')
        })
      }
    })

    return $.html()
  }

  return html
}

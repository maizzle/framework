const cheerio = require('cheerio')

module.exports = async (html, config) => {

  if (config.cleanup && config.cleanup.keepOnlyAttributeSizes) {
    let $ = cheerio.load(html, { decodeEntities: false })
    Object.entries(config.cleanup.keepOnlyAttributeSizes).map(([k, v]) => {
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

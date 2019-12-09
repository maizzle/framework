const cheerio = require('cheerio')

module.exports = async (html, config) => {
  if (config.cleanup && config.cleanup.preferBgColorAttribute) {
    const $ = cheerio.load(html, { decodeEntities: false })
    $('[bgcolor]').each((i, el) => {
      $(el).css('background-color', '')
    })

    return $.html()
  }

  return html
}

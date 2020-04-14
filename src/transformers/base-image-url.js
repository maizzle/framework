const isUrl = require('is-url-superb')

module.exports = async (html, config) => {
  const url = config.baseImageURL

  if (url && isUrl(url)) {
    return html.replace(/(background="|src=")(?!\s+|url\('?'?\)|"|https?:\/\/)\/?/gi, '$1' + url)
      .replace(/(background(-image)?:\s?url\('?)(?![')]|https?:\/\/)\/?/gi, '$1' + url)
  }

  return html
}

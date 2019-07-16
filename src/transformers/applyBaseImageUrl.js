const isUrl = require('is-url-superb')

module.exports = async (html, config) => {

  const url = config.baseImageURL

  if (url && isUrl(url)) {
    return html.replace(/(background="|src=")(?!\s+|url\('?'?\)|"|https?:\/\/)\/?/ig, '$1' + url)
      .replace(/(background(-image)?:\s?url\('?)(?!['\)]|https?:\/\/)\/?/ig, '$1' + url)
  }

  return html
}

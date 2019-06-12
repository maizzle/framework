const isUrl = require('is-url-superb')

module.exports = async (html, config) => {

  const url = config.baseImageURL

  if (isUrl(url)) {
    return html.replace(/(background="|src=")(?!https?:\/\/)\/?/ig, '$1' + url)
      .replace(/(background(-image)?:\s?url\('?)(?!'?https?:\/\/)\/?/ig, '$1' + url)
  }

  return html
}

module.exports = async (html, config = {}, direct = false) => {
  const url = direct ? config : config.baseImageURL

  if (url) {
    // HTML Attributes
    html = html.replace(/([^"'=\s]+[^url(]\.(?:jpe?g|a?png|avif|gif|svg|webp|jfif|pjpeg|pjp))/gi, url + '$1')

    // Inline CSS
    html = html.replace(/(background(-image)?:\s?url\('?)(?![')]|https?:\/\/)\/?/gi, '$1' + url)

    return html
  }

  return html
}

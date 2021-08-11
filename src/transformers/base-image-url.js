module.exports = async (html, config = {}, direct = false) => {
  const url = direct ? config : config.baseImageURL

  if (url) {
    return html.replace(/([^"'=\s(]+\.(?:jpe?g|a?png|avif|gif|svg|webp|jfif|pjpeg|pjp))/gi, url + '$1')
  }

  return html
}

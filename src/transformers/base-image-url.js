module.exports = async (html, config = {}, direct = false) => {
  const url = direct ? config : config.baseImageURL

  if (url) {
    return html.replace(/(background="|src=")(?!\s+|url\('?'?\)|"|https?:\/\/)\/?/gi, '$1' + url)
      .replace(/(background(-image)?:\s?url\('?)(?![')]|https?:\/\/)\/?/gi, '$1' + url)
  }

  return html
}

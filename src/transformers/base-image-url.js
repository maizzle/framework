module.exports = async (html, config) => {
  const url = config.baseImageURL

  if (url) {
    return html.replace(/(background="|src=")(?!\s+|url\('?'?\)|"|https?:\/\/)\/?/gi, '$1' + url)
      .replace(/(background(-image)?:\s?url\('?)(?![')]|https?:\/\/)\/?/gi, '$1' + url)
  }

  return html
}

module.exports = async (html, config) => {

  let url = config.baseImageURL

  // TODO: check for a 'valid' URL?
  if (url && url.length > 0) {
    return html.replace(/src=("|')([^("|')]*)("|')/gi, 'src="' + url + '$2"')
      .replace(/background=("|')([^("|')]*)("|')/gi, 'background="' + url + '$2"')
      .replace(/background(-image)?:\s?url\(("|')?([^("|')]*)("|')?\)/gi, "background-image: url('" + url + "$3')")
  }

  return html
}

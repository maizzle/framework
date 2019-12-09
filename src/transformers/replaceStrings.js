module.exports = async (html, config) => {
  const regexes = config.cleanup && config.cleanup.replaceStrings ? config.cleanup.replaceStrings : false

  if (typeof regexes === 'object') {
    Object.entries(regexes).map(([k, v]) => {
      const regex = new RegExp(k, 'gi')
      html = html.replace(regex, v)
    })
  }

  return html
}

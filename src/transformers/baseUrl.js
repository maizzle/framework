const posthtml = require('posthtml')
const isUrl = require('is-url-superb')
const baseUrl = require('posthtml-base-url')
const {get, isObject, isEmpty} = require('lodash')

// VML backgrounds need regex because they're inside HTML comments :(
const rewriteVMLs = (html, url) => {
  const vImageMatch = html.match(/(<v:image.+)(src=['"]([^'"]+)['"])/)
  const vFillMatch = html.match(/(<v:fill.+)(src=['"]([^'"]+)['"])/)

  if (!isUrl(vImageMatch[3])) {
    html = html.replace(vImageMatch[0], `${vImageMatch[1]}src="${url}${vImageMatch[3]}"`)
  }

  if (!isUrl(vFillMatch[3])) {
    html = html.replace(vFillMatch[0], `${vFillMatch[1]}src="${url}${vFillMatch[3]}"`)
  }

  return html
}

module.exports = async (html, config = {}, direct = false) => {
  const url = direct ? config : get(config, 'baseURL')
  const posthtmlOptions = get(config, 'build.posthtml.options', {})

  // `baseUrl` as a string
  if (typeof url === 'string' && url.length > 0) {
    html = rewriteVMLs(html, url)

    return posthtml([
      baseUrl({url, allTags: true, styleTag: true, inlineCss: true})
    ])
      .process(html, posthtmlOptions)
      .then(result => result.html)
  }

  // `baseUrl: {}`
  if (isObject(url) && !isEmpty(url)) {
    html = rewriteVMLs(html, url.url)

    return posthtml([baseUrl(url)]).process(html, posthtmlOptions).then(result => result.html)
  }

  return html
}

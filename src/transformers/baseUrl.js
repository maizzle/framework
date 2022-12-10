const posthtml = require('posthtml')
const isUrl = require('is-url-superb')
const baseUrl = require('posthtml-base-url')
const {get, merge, isObject, isEmpty} = require('lodash')
const defaultConfig = require('../generators/posthtml/defaultConfig')

module.exports = async (html, config = {}, direct = false) => {
  const url = direct ? config : get(config, 'baseURL', get(config, 'baseUrl'))
  const posthtmlOptions = merge(defaultConfig, get(config, 'build.posthtml.options', {}))

  // Handle `baseUrl` as a string
  if (typeof url === 'string' && url.length > 0) {
    html = rewriteVMLs(html, url)

    return posthtml([
      baseUrl({url, allTags: true, styleTag: true, inlineCss: true})
    ])
      .process(html, posthtmlOptions)
      .then(result => result.html)
  }

  // Handle `baseURL` as an object
  if (isObject(url) && !isEmpty(url)) {
    html = rewriteVMLs(html, get(url, 'url', ''))

    return posthtml([baseUrl(url)]).process(html, posthtmlOptions).then(result => result.html)
  }

  return html
}

/**
 * VML backgrounds must be handled with regex because
 * they're inside HTML comments.
 */
const rewriteVMLs = (html, url) => {
  // Handle <v:image>
  const vImageMatches = html.match(/<v:image[^>]+src="?([^"\s]+)"/g)

  if (vImageMatches) {
    vImageMatches.forEach(match => {
      const vImage = match.match(/<v:image[^>]+src="?([^"\s]+)"/)
      const vImageSrc = vImage[1]

      if (!isUrl(vImageSrc)) {
        const vImageSrcUrl = url + vImageSrc
        const vImageReplace = vImage[0].replace(vImageSrc, vImageSrcUrl)
        html = html.replace(vImage[0], vImageReplace)
      }
    })
  }

  // Handle <v:fill>
  const vFillMatches = html.match(/<v:fill[^>]+src="?([^"\s]+)"/g)

  if (vFillMatches) {
    vFillMatches.forEach(match => {
      const vFill = match.match(/<v:fill[^>]+src="?([^"\s]+)"/)
      const vFillSrc = vFill[1]

      if (!isUrl(vFillSrc)) {
        const vFillSrcUrl = url + vFillSrc
        const vFillReplace = vFill[0].replace(vFillSrc, vFillSrcUrl)
        html = html.replace(vFill[0], vFillReplace)
      }
    })
  }

  return html
}

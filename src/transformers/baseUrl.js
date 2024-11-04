import posthtml from 'posthtml'
import isUrl from 'is-url-superb'
import get from 'lodash-es/get.js'
import baseUrl from 'posthtml-base-url'
import { render } from 'posthtml-render'
import isEmpty from 'lodash-es/isEmpty.js'
import isObject from 'lodash-es/isObject.js'
import { parser as parse } from 'posthtml-parser'
import { getPosthtmlOptions } from '../posthtml/defaultConfig.js'

const posthtmlOptions = getPosthtmlOptions()

const posthtmlPlugin = url => tree => {
  // Handle `baseURL` as a string
  if (typeof url === 'string' && url.length > 0) {
    const html = rewriteVMLs(render(tree), url)

    return baseUrl({
      url,
      allTags: true,
      styleTag: true,
      inlineCss: true
    })(parse(html, posthtmlOptions))
  }

  // Handle `baseURL` as an object
  if (isObject(url) && !isEmpty(url)) {
    const html = rewriteVMLs(render(tree), get(url, 'url', ''))
    const {
      styleTag = true,
      inlineCss = true,
      allTags,
      tags,
      url: baseURL,
    } = url

    return baseUrl({
      styleTag,
      inlineCss,
      allTags,
      tags,
      url: baseURL,
    })(parse(html, posthtmlOptions))
  }

  return tree
}

export default posthtmlPlugin

export async function addBaseUrl(html = '', options = {}, posthtmlOptions = {}) {
  return posthtml([
    posthtmlPlugin(options)
  ])
    .process(html, getPosthtmlOptions())
    .then(result => result.html)
}

/**
 * Handle VML
 *
 * VML backgrounds must be handled with regex because
 * they're inside HTML comments.
 *
 * @param {string} html The HTML content
 * @param {string} url The base URL to prepend
 * @returns {string} The modified HTML
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

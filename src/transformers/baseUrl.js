import posthtml from 'posthtml'
import isUrl from 'is-url-superb'
import get from 'lodash-es/get.js'
import { render } from 'posthtml-render'
import isEmpty from 'lodash-es/isEmpty.js'
import isObject from 'lodash-es/isObject.js'
import { parser as parse } from 'posthtml-parser'
import { getPosthtmlOptions } from '../posthtml/defaultConfig.js'
import baseUrl, { parseSrcset, stringifySrcset, defaultTags } from 'posthtml-base-url'

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

export async function addBaseUrl(html = '', options = {}, posthtmlOpts = {}) {
  return posthtml([
    posthtmlPlugin(options)
  ])
    .process(html, getPosthtmlOptions(posthtmlOpts))
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

  /**
   * Handle other sources inside MSO comments
   */

  // Make a pipe-separated list of all the default tags and use it to create a regex
  const uniqueSourceAttributes = [
    ...new Set(Object.values(defaultTags).flatMap(Object.keys))
  ].join('|')

  /**
   * This regex uses a negative lookbehind to avoid matching VML elements
   * like <v:image> and <v:fill>, which are already handled above.
   */
  const sourceAttrRegex = new RegExp(`(?<!<v:image|fill[^>]*]*)\\b(${uniqueSourceAttributes})="([^"]+)"`, 'g')

  // Replace all the source attributes inside MSO comments
  html = html.replace(/<!--\[if [^\]]+\]>[\s\S]*?<!\[endif\]-->/g, (msoBlock) => {
    return msoBlock.replace(sourceAttrRegex, (match, attr, value) => {
      if (isUrl(value)) {
        return match
      }

      const updatedValue = attr === 'srcset'
        ? processSrcset(value, url)
        : url + value

      return `${attr}="${updatedValue}"`
    })
  })

  return html
}

/**
 * Add the base URL to the srcset URLs
 *
 * @param {*} srcsetValue The value of the srcset attribute
 * @param {*} url The base URL
 * @returns {string} The updated srcset attribute value
 */
function processSrcset(srcsetValue, url) {
  const parsed = parseSrcset(srcsetValue)

  parsed.map(p => {
    if (!isUrl(p.url)) {
      p.url = url + p.url
    }

    return p
  })

  return stringifySrcset(parsed)
}

const {comb} = require('email-comb')
const {get, merge, isEmpty, isObject} = require('lodash')
const removeInlinedClasses = require('./removeInlinedSelectors')

module.exports = async (html, config = {}, direct = false) => {
  config = direct ? config : get(config, 'removeUnusedCSS')

  // Don't purge CSS if `removeUnusedCSS` is not set
  if (!config || (isObject(config) && isEmpty(config))) {
    return html
  }

  const safelist = [
    '*body*', // Gmail
    '.gmail*', // Gmail
    '.apple*', // Apple Mail
    '.ios*', // Mail on iOS
    '.ox-*', // Open-Xchange
    '.outlook*', // Outlook.com
    '[data-ogs*', // Outlook.com
    '.bloop_container', // Airmail
    '.Singleton', // Apple Mail 10
    '.unused', // Notes 8
    '.moz-text-html', // Thunderbird
    '.mail-detail-content', // Comcast, Libero webmail
    '*edo*', // Edison (all)
    '#*', // Freenet uses #msgBody
    '.lang*' // Fenced code blocks
  ]

  const defaultOptions = {
    backend: [
      {heads: '{{', tails: '}}'},
      {heads: '{%', tails: '%}'}
    ],
    whitelist: [...get(config, 'whitelist', []), ...safelist]
  }

  const options = merge(defaultOptions, get(config, 'removeUnusedCSS', {}))

  /**
   * Remove possibly inlined selectors, as long as we're not calling
   * this function directly, i.e. Maizzle.removeUnusedCSS()
   *  */
  html = direct ? html : await removeInlinedClasses(html, options)

  return comb(html, options).result
}

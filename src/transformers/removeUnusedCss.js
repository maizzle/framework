const {comb} = require('email-comb')
const {get, merge} = require('lodash')
const removeInlinedClasses = require('./removeInlinedSelectors')

module.exports = async (html, config = {}) => {
  // If it's explicitly disabled, return the HTML
  if (get(config, 'removeUnusedCSS') === false) {
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

  const options = merge(defaultOptions, get(config, 'removeUnusedCSS', config))

  html = await removeInlinedClasses(html, options)

  return comb(html, options).result
}

const {comb} = require('email-comb')
const {get, merge} = require('lodash')

module.exports = async (html, config = {}) => {
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
    '.ogs*', // Outlook.com
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

  const options = typeof config === 'boolean' && config ?
    defaultOptions :
    merge(defaultOptions, get(config, 'removeUnusedCSS', config))

  return comb(html, options).result
}

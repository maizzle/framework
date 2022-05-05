const {comb} = require('email-comb')
const {get, isEmpty} = require('lodash')

module.exports = async (html, config = {}, direct = false) => {
  if (get(config, 'removeUnusedCSS') === false) {
    return html
  }

  const options = direct ? config : get(config, 'removeUnusedCSS', {})

  const safelist = [
    '*body*', // Gmail
    '.outlook*', // Outlook.com
    '.bloop_container', // Airmail
    '.Singleton', // Apple Mail 10
    '.unused', // Notes 8
    '.moz-text-html', // Thunderbird
    '.mail-detail-content', // Comcast, Libero webmail
    '*edo*', // Edison (all)
    '#*', // Freenet uses #msgBody
    '.lang*' // Fenced code blocks
  ]

  if (typeof options === 'boolean' && options) {
    return comb(html, {whitelist: safelist}).result
  }

  if (!isEmpty(options)) {
    options.whitelist = [...get(options, 'whitelist', []), ...safelist]

    return comb(html, options).result
  }

  return html
}

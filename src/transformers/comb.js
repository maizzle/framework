import posthtml from 'posthtml'
import get from 'lodash-es/get.js'
import { defu as merge } from 'defu'
import { render } from 'posthtml-render'
import { comb as emailComb } from 'email-comb'
import { parser as parse } from 'posthtml-parser'
import posthtmlConfig from '../posthtml/defaultConfig.js'

const posthtmlPlugin = options => tree => {
  const defaultSafelist = [
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
      { heads: '{{', tails: '}}' },
      { heads: '{%', tails: '%}' },
    ],
    whitelist: [...defaultSafelist, ...get(options, 'whitelist', [])]
  }

  options = merge(options, defaultOptions)

  const { result: html } = emailComb(render(tree), options)

  return parse(html)
}

export default posthtmlPlugin

export async function comb(html = '', options = {}, posthtmlOptions = {}) {
  return posthtml([
    posthtmlPlugin(options)
  ])
    .process(html, merge(posthtmlOptions, posthtmlConfig))
    .then(result => result.html)
}

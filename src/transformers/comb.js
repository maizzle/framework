import posthtml from 'posthtml'
import get from 'lodash-es/get.js'
import { defu as merge } from 'defu'
import { render } from 'posthtml-render'
import { comb as emailComb } from 'email-comb'
import { parser as parse } from 'posthtml-parser'
import { getPosthtmlOptions } from '../posthtml/defaultConfig.js'

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
    whitelist: [...defaultSafelist, ...get(options, 'safelist', [])]
  }

  options = merge(options, defaultOptions)

  const posthtmlConfig = getPosthtmlOptions()
  const { result: html } = emailComb(render(tree), options)

  return parse(html, posthtmlConfig)
}

export default posthtmlPlugin

export async function comb(html = '', pluginOptions = {}, posthtmlOptions = {}) {
  return posthtml([
    posthtmlPlugin(pluginOptions)
  ])
    .process(html, posthtmlOptions)
    .then(result => result.html)
}

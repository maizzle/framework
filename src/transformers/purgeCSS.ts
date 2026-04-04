import { comb } from 'email-comb'
import { defu as merge } from 'defu'
import type { ChildNode } from 'domhandler'
import { parse, serialize } from '../utils/ast/index.ts'
import type { CssConfig } from '../types/config.ts'

const DEFAULT_SAFELIST: string[] = [
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
  '.lang*', // Fenced code blocks
]

const DEFAULT_OPTIONS = {
  backend: [
    { heads: '{{', tails: '}}' },
    { heads: '{%', tails: '%}' },
  ],
  whitelist: [...DEFAULT_SAFELIST],
}

/**
 * Remove unused CSS transformer.
 *
 * Uses `email-comb` to strip CSS selectors and corresponding class/id
 * references that are not matched anywhere in the HTML body.
 *
 * Enable by setting `css.purge: true` (or passing options).
 * The user-supplied options are merged on top of the defaults, so
 * `safelist` values are **appended** to the built-in safelist rather
 * than replacing it.
 *
 * Accepts `ChildNode[]` as input, serializes internally before passing
 * to email-comb (which requires a raw HTML string), then parses the
 * result back to `ChildNode[]` so it fits in the DOM pipeline.
 */
export function purgeCSS(dom: ChildNode[], config: CssConfig = {}): ChildNode[] {
  const option = config.purge

  if (!option) return dom

  const userOptions = typeof option === 'object' ? option : {}

  // Merge user options on top of defaults.
  // defu merges objects deeply; for arrays it appends user values.
  // We want the user safelist appended to the default safelist,
  // so we build whitelist manually.
  const userSafelist = Array.isArray((userOptions as any).safelist)
    ? (userOptions as any).safelist as string[]
    : []

  const { safelist: _discard, ...restUserOptions } = userOptions as any

  const options = merge(
    { ...restUserOptions, whitelist: [...DEFAULT_SAFELIST, ...userSafelist] },
    DEFAULT_OPTIONS,
  )

  const { result } = comb(serialize(dom), options)

  return parse(result)
}

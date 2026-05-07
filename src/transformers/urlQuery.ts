import queryString from 'query-string'
import { selectAll } from 'css-select'
import type { ChildNode, Element } from 'domhandler'
import { parse, serialize } from '../utils/ast/index.ts'
import { isAbsoluteUrl } from '../utils/url.ts'
import type { UrlQueryOptions } from '../types/config.ts'

const DEFAULT_ATTRIBUTES = ['src', 'href', 'poster', 'srcset', 'background']
const DEFAULT_TAGS = ['a']

/**
 * Append query parameters to a URL string using query-string.
 */
function appendParams(
  url: string,
  params: Record<string, unknown>,
  qsOptions: queryString.StringifyOptions,
  strict: boolean,
): string {
  if (strict && !isAbsoluteUrl(url)) return url

  return queryString.stringifyUrl(
    { url, query: params as queryString.StringifiableRecord },
    qsOptions,
  )
}

/**
 * Append query parameters to URLs found in matching attributes/elements.
 *
 * @param html    HTML string to transform.
 * @param params  Query parameters to append (e.g. `{ utm_source: 'newsletter' }`).
 * @param options Behaviour overrides — `tags` (CSS selectors, default `['a']`),
 *                `attributes` (default `['src', 'href', 'poster', 'srcset', 'background']`),
 *                `strict` (default `true`, only rewrites absolute URLs),
 *                `qs` (forwarded to `query-string`, default `{ encode: false }`).
 * @returns       The transformed HTML string.
 *
 * @example
 * import { urlQuery } from '@maizzle/framework'
 *
 * const out = urlQuery(
 *   '<a href="https://example.com">x</a>',
 *   { utm_source: 'newsletter' },
 * )
 *
 * // Restrict to specific tags / attributes:
 * urlQuery(html, { ref: 'email' }, { tags: ['a', 'img'], attributes: ['href', 'src'] })
 */
export function urlQuery(
  html: string,
  params: Record<string, unknown> = {},
  options: UrlQueryOptions = {},
): string {
  return serialize(urlQueryDom(parse(html), params, options))
}

/**
 * DOM-form of {@link urlQuery} used by the internal transformer pipeline.
 * Takes a parsed DOM, returns a parsed DOM — avoids redundant
 * serialize/parse round-trips when chained with other transformers.
 */
export function urlQueryDom(
  dom: ChildNode[],
  params: Record<string, unknown> = {},
  options: UrlQueryOptions = {},
): ChildNode[] {
  if (!params || Object.keys(params).length === 0) return dom

  const tags = options.tags ?? DEFAULT_TAGS
  const attributes = options.attributes ?? DEFAULT_ATTRIBUTES
  const strict = options.strict ?? true
  const qsOptions: queryString.StringifyOptions = { encode: false, ...((options.qs ?? {}) as queryString.StringifyOptions) }

  // Use css-select to find all elements matching any of the tag selectors
  const selector = tags.join(', ')
  const elements = selectAll(selector, dom) as Element[]

  for (const el of elements) {
    for (const attr of attributes) {
      const value = el.attribs[attr]
      if (!value) continue

      const updated = appendParams(value, params, qsOptions, strict)
      if (updated !== value) {
        el.attribs[attr] = updated
      }
    }
  }

  return dom
}

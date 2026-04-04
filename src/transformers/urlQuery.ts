import queryString from 'query-string'
import { selectAll } from 'css-select'
import type { ChildNode, Element } from 'domhandler'
import { isAbsoluteUrl } from '../utils/url.ts'
import type { UrlConfig, UrlQueryOptions } from '../types/config.ts'

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
 * URL query transformer.
 *
 * Appends query parameters to URLs found in specified attributes of
 * specified HTML tags.
 *
 * Reads config from the `config.url` object in `MaizzleConfig` (pass
 * `config.url` directly when calling as a standalone transformer).
 * The `_options` key inside `query` controls behaviour:
 * - `tags`       — CSS selectors for elements to process. Default: `['a']`
 * - `attributes` — attribute names to process. Default: `['src', 'href', 'poster', 'srcset', 'background']`
 * - `strict`     — only append to absolute URLs. Default: `true`
 * - `qs`         — options forwarded to query-string. Default: `{ encode: false }`
 *
 * All non-`_options` keys inside `query` are treated as URL parameters to append.
 */
export function urlQuery(dom: ChildNode[], config: UrlConfig = {}): ChildNode[] {
  const queryConfig = config.query

  if (!queryConfig || Object.keys(queryConfig).length === 0) return dom

  const { _options, ...params } = queryConfig as Record<string, unknown>
  const options = (_options ?? {}) as UrlQueryOptions

  if (Object.keys(params).length === 0) return dom

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

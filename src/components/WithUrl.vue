<script lang="ts">
import { defineComponent, h, Fragment } from 'vue'
import queryString from 'query-string'
import isUrl from 'is-url-superb'

const defaultTags: Record<string, string[]> = {
  a: ['href'],
  img: ['src', 'srcset'],
  video: ['src', 'poster'],
  source: ['src', 'srcset'],
  link: ['href'],
  script: ['src'],
  object: ['data'],
  embed: ['src'],
  iframe: ['src'],
  'v:image': ['src'],
  'v:fill': ['src'],
}

const urlAttributes = [...new Set(Object.values(defaultTags).flat())]

function isAbsoluteUrl(url: string): boolean {
  if (!url) return true

  return url.startsWith('//') || url.startsWith('#') || url.startsWith('?') || isUrl(url)
}

function processSrcset(srcset: string, baseUrl: string): string {
  return srcset.split(',').map(entry => {
    const parts = entry.trim().split(/\s+/)

    if (parts[0] && !isAbsoluteUrl(parts[0])) {
      parts[0] = baseUrl + parts[0]
    }

    return parts.join(' ')
  }).join(', ')
}

// ─── Base URL helpers ────────────────────────────────────────────────────────

/**
 * Join a base URL and a relative path, normalising slashes between them so
 * neither the user nor the template author needs to worry about trailing /
 * on the base or leading / on the path.
 *
 * Examples:
 *   joinUrl('https://example.com',  'about')     → 'https://example.com/about'
 *   joinUrl('https://example.com/', '/about')    → 'https://example.com/about'
 *   joinUrl('https://cdn.example.com/assets', 'image.jpg') → 'https://cdn.example.com/assets/image.jpg'
 */
function joinUrl(base: string, path: string): string {
  return base.replace(/\/+$/, '') + '/' + path.replace(/^\/+/, '')
}

function applyBaseUrl(attrs: string[], props: Record<string, any> | null, baseUrl: string): Record<string, any> | null {
  if (!props) return props

  let newProps: Record<string, any> | undefined

  for (const attr of attrs) {
    const value = props[attr]

    if (typeof value !== 'string' || isAbsoluteUrl(value)) continue

    if (!newProps) newProps = { ...props }

    newProps[attr] = attr === 'srcset'
      ? processSrcset(value, baseUrl.replace(/\/+$/, '') + '/')
      : joinUrl(baseUrl, value)
  }

  return newProps ?? props
}

// ─── Query parameter helpers ──────────────────────────────────────────────────

function applyQueryParams(attrs: string[], props: Record<string, any> | null, params: Record<string, unknown>): Record<string, any> | null {
  if (!props) return props

  let newProps: Record<string, any> | undefined

  for (const attr of attrs) {
    const value = props[attr]

    if (typeof value !== 'string' || !value) continue

    const updated = queryString.stringifyUrl(
      { url: value, query: params as queryString.StringifiableRecord },
      { encode: false },
    )

    if (updated === value) continue

    if (!newProps) newProps = { ...props }

    newProps[attr] = updated
  }

  return newProps ?? props
}

// ─── VNode walker ─────────────────────────────────────────────────────────────

function processVNode(vnode: any, baseUrl: string | undefined, params: Record<string, unknown> | undefined): any {
  if (vnode == null || typeof vnode !== 'object') return vnode

  if (vnode.type === Fragment) {
    return h(
      Fragment,
      null,
      Array.isArray(vnode.children)
        ? vnode.children.map((child: any) => processVNode(child, baseUrl, params))
        : vnode.children,
    )
  }

  if (typeof vnode.type === 'string') {
    const attrs = defaultTags[vnode.type]
    let newProps = vnode.props

    if (attrs) {
      if (baseUrl) newProps = applyBaseUrl(attrs, newProps, baseUrl)
      if (params) newProps = applyQueryParams(attrs, newProps, params)
    }

    const newChildren = Array.isArray(vnode.children)
      ? vnode.children.map((child: any) => processVNode(child, baseUrl, params))
      : vnode.children

    return h(vnode.type, newProps, newChildren)
  }

  // Component VNode — rewrite any URL-like props before the component renders
  if (typeof vnode.type === 'object' || typeof vnode.type === 'function') {
    let newProps = vnode.props

    if (baseUrl) newProps = applyBaseUrl(urlAttributes, newProps, baseUrl)
    if (params) newProps = applyQueryParams(urlAttributes, newProps, params)

    return h(vnode.type, newProps, vnode.children)
  }

  return vnode
}

/**
 * Maizzle component that rewrites URL attributes in all child elements.
 *
 * - `base` — optional base URL prepended to all relative URLs
 * - `parameters` — optional query string (e.g. `"utm_source=foo&bar=baz"`)
 *   appended to all URLs
 *
 * @see https://maizzle.com/docs/components/with-url
 */
export default defineComponent({
  name: 'WithUrl',

  props: {
    /**
     * Base URL to prepend to all relative URLs found in child elements.
     */
    base: {
      type: String,
      default: undefined,
    },

    /**
     * Query parameters to append to all URLs found in child elements.
     * Provide as a query string, e.g. `"utm_source=foo&bar=baz"`.
     */
    parameters: {
      type: String,
      default: undefined,
    },
  },

  setup(props, { slots }) {
    return () => {
      const params = props.parameters
        ? queryString.parse(props.parameters, { decode: false })
        : undefined

      return (slots.default?.() ?? []).map(
        (vnode: any) => processVNode(vnode, props.base, params),
      )
    }
  },
})
</script>

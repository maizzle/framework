import postcss from 'postcss'
import safeParser from 'postcss-safe-parser'
import valueParser from 'postcss-value-parser'
import { walk, serialize, parse } from '../utils/ast/index.ts'
import { isAbsoluteUrl, defaultTags, processSrcset } from '../utils/url.ts'
import type { ChildNode, Element } from 'domhandler'

/**
 * Options for the `base` transformer.
 */
export interface BaseUrlOptions {
  /** Base URL to prepend to relative links. */
  url?: string
  /**
   * Tag/attribute scope for prepending. Omit to use the built-in defaults
   * (`a[href]`, `img[src]`, `link[href]`, etc.).
   *
   * - Array of tag names — restrict the built-in defaults to these tags.
   * - Object — explicit per-tag attribute map. Each attribute value is
   *   `true` (use the base url) or a string (use that string as the url
   *   for this attribute only).
   */
  tags?: string[] | Record<string, Record<string, string | boolean>>
  /**
   * Custom attributes to rewrite globally, regardless of tag. Each key
   * is the attribute name; the value is the URL to prepend.
   */
  attributes?: Record<string, string>
  /**
   * Rewrite `url()` references inside `<style>` tag contents.
   *
   * @default true
   */
  styleTag?: boolean
  /**
   * Rewrite `url()` references inside inline `style` attributes.
   *
   * @default true
   */
  inlineCss?: boolean
}

const sourceAttributes = ['src', 'href', 'srcset', 'poster', 'background', 'data']

/**
 * Convert the shared `defaultTags` (tag → string[]) into the richer format
 * the transformer needs (tag → Record<attr, true>).
 */
const defaultTagConfig: Record<string, Record<string, string | boolean>> = Object.fromEntries(
  Object.entries(defaultTags).map(([tag, attrs]) => [
    tag,
    Object.fromEntries(attrs.map(attr => [attr, true])),
  ]),
)

const postcssBaseUrl: postcss.PluginCreator<{ url: string }> = (opts) => {
  return {
    postcssPlugin: 'postcss-base-url',
    Declaration(decl) {
      if (!decl.value.includes('url(')) return

      const parsed = valueParser(decl.value)
      let changed = false

      parsed.walk(node => {
        if (node.type !== 'function' || node.value !== 'url') return

        const urlNode = node.nodes[0]
        if (!urlNode) return

        if (isAbsoluteUrl(urlNode.value)) return

        urlNode.value = opts!.url + urlNode.value
        changed = true
      })

      if (changed) {
        decl.value = parsed.toString()
      }
    }
  }
}
postcssBaseUrl.postcss = true

function processCss(css: string, url: string): string {
  const { css: result } = postcss([postcssBaseUrl({ url })]).process(css, { parser: safeParser, from: undefined })
  return result
}

function processInlineStyle(style: string, url: string): string {
  const { css } = postcss([postcssBaseUrl({ url })]).process(`a{${style}}`, { parser: safeParser, from: undefined })
  return css.slice(css.indexOf('{') + 1, css.lastIndexOf('}')).trim()
}

function resolveOptions(input: string | BaseUrlOptions | undefined | null | false): BaseUrlOptions | undefined {
  if (!input) return undefined
  if (typeof input === 'string') {
    return { url: input, styleTag: true, inlineCss: true }
  }
  if (typeof input === 'object' && 'url' in input) {
    return {
      url: input.url ?? '',
      tags: input.tags,
      attributes: input.attributes,
      styleTag: input.styleTag ?? true,
      inlineCss: input.inlineCss ?? true,
    }
  }
  return undefined
}

function getTagConfig(
  tagName: string,
  options: BaseUrlOptions
): Record<string, string | boolean> | undefined {
  const { tags } = options

  if (tags === undefined) {
    return defaultTagConfig[tagName]
  }

  if (Array.isArray(tags)) {
    if (!tags.includes(tagName)) return undefined
    return defaultTagConfig[tagName]
  }

  if (typeof tags === 'object') {
    return tags[tagName]
  }

  return undefined
}

/**
 * Prepend a base URL to relative `src`/`href`/etc. references throughout
 * the document, including inside `<style>` blocks, inline `style`
 * attributes, MSO conditional comments, and VML tags.
 *
 * @param html    HTML string to transform.
 * @param options Either a base URL string, or a {@link BaseUrlOptions} object
 *                for finer control.
 * @returns       The transformed HTML string.
 *
 * @example
 * import { base } from '@maizzle/framework'
 *
 * // Just a URL — applied with the built-in tag/attribute defaults.
 * const out = base('<img src="/a.png">', 'https://cdn.example.com/')
 *
 * // Restrict to specific tags, opt out of style rewriting:
 * const limited = base(html, {
 *   url: 'https://cdn.example.com/',
 *   tags: ['img'],
 *   styleTag: false,
 *   inlineCss: false,
 * })
 */
export function base(html: string, options: string | BaseUrlOptions): string {
  return serialize(baseDom(parse(html), options))
}

/**
 * DOM-form of {@link base} used by the internal transformer pipeline.
 * Takes a parsed DOM, returns a parsed DOM — avoids redundant
 * serialize/parse round-trips when chained with other transformers.
 */
export function baseDom(dom: ChildNode[], options: string | BaseUrlOptions | undefined | null | false): ChildNode[] {
  const resolved = resolveOptions(options)
  if (!resolved || !resolved.url) return dom

  const { url: baseUrl, styleTag = true, inlineCss = true, attributes = {} } = resolved

  walk(dom, (node) => {
    const el = node as Element
    if (!el.name) return

    // Process <style> tag content with PostCSS
    if (el.name === 'style' && styleTag && el.children) {
      for (const child of el.children) {
        if (child.type === 'text') {
          const textNode = child as unknown as { data: string }
          const processed = processCss(textNode.data, baseUrl)
          if (processed !== textNode.data) {
            textNode.data = processed
          }
        }
      }
      return
    }

    // Process tag-specific attributes (respects tags filter)
    const tagConfig = getTagConfig(el.name, resolved)

    if (tagConfig || resolved.tags === undefined) {
      for (const [attr, value] of Object.entries(el.attribs)) {
        if (!value) continue

        const attrConfig = tagConfig?.[attr]
        if (!attrConfig && attr !== 'style') continue

        if (attr === 'srcset' && (attrConfig === true || typeof attrConfig === 'string')) {
          const newSrcset = processSrcset(value, typeof attrConfig === 'string' ? attrConfig : baseUrl)
          if (newSrcset !== value) {
            el.attribs.srcset = newSrcset
          }
        } else if (attr === 'style' && inlineCss && value.includes('url(')) {
          const newStyle = processInlineStyle(value, baseUrl)
          if (newStyle !== value) {
            el.attribs.style = newStyle
          }
        } else if (attrConfig === true && !isAbsoluteUrl(value)) {
          el.attribs[attr] = baseUrl + value
        } else if (typeof attrConfig === 'string' && !isAbsoluteUrl(value)) {
          el.attribs[attr] = attrConfig + value
        }
      }
    }

    // Process custom attributes (not affected by tags filter)
    for (const [attr, url] of Object.entries(attributes)) {
      if (el.attribs[attr] && !isAbsoluteUrl(el.attribs[attr])) {
        el.attribs[attr] = url + el.attribs[attr]
      }
    }
  })

  /**
   * VML and MSO comment rewrites require operating on serialized HTML
   * (HTML comments are not represented as traversable DOM nodes).
   */
  const serialized = serialize(dom)
  const rewritten = rewriteMsoComments(rewriteVMLs(serialized, baseUrl), baseUrl)

  // Only re-parse if the regex passes actually changed anything
  if (rewritten !== serialized) {
    return parse(rewritten)
  }

  return dom
}

function rewriteVMLs(html: string, url: string): string {
  html = html.replace(/<v:image[^>]+src="?([^"\s]+)"/gi, (match, src) => {
    if (isAbsoluteUrl(src)) return match
    return match.replace(src, url + src)
  })

  html = html.replace(/<v:fill[^>]+src="?([^"\s]+)"/gi, (match, src) => {
    if (isAbsoluteUrl(src)) return match
    return match.replace(src, url + src)
  })

  return html
}

function rewriteMsoComments(html: string, url: string): string {
  return html.replace(/<!--\[if [^\]]+\]>[\s\S]*?<!\[endif\]-->/g, (msoBlock) => {
    let result = msoBlock

    for (const attr of sourceAttributes) {
      const attrRegex = new RegExp(`\\b${attr}="([^"]+)"`, 'gi')
      result = result.replace(attrRegex, (match, value) => {
        if (isAbsoluteUrl(value)) return match

        if (attr === 'srcset') {
          return `srcset="${processSrcset(value, url)}"`
        }

        return `${attr}="${url}${value}"`
      })
    }

    // Use PostCSS for style attribute url() rewriting inside MSO comments
    result = result.replace(/style="([^"]+)"/gi, (match, style) => {
      if (!style.includes('url(')) return match
      const processed = processInlineStyle(style, url)
      return `style="${processed}"`
    })

    return result
  })
}

import postcss from 'postcss'
import safeParser from 'postcss-safe-parser'
import valueParser from 'postcss-value-parser'
import { walk, serialize, parse } from '../utils/ast/index.ts'
import { isAbsoluteUrl, defaultTags, processSrcset } from '../utils/url.ts'
import type { ChildNode, Element } from 'domhandler'
import type { UrlConfig } from '../types/config.ts'

interface BaseUrlOptions {
  url: string
  tags?: string[] | Record<string, Record<string, string | boolean>>
  attributes?: Record<string, string>
  styleTag?: boolean
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
  try {
    const { css } = postcss([postcssBaseUrl({ url })]).process(`a{${style}}`, { parser: safeParser, from: undefined })
    const match = css.match(/a\s*\{\s*([\s\S]*?)\s*\}/)
    return match?.[1]?.trim() ?? style
  } catch {
    return style
  }
}

function getBaseUrl(config: UrlConfig): string | BaseUrlOptions | undefined {
  const baseUrlConfig = config.base
  if (!baseUrlConfig || baseUrlConfig === '') {
    return undefined
  }
  return baseUrlConfig as string | BaseUrlOptions | undefined
}

function resolveOptions(baseUrlConfig: string | BaseUrlOptions | undefined): BaseUrlOptions | undefined {
  if (!baseUrlConfig) return undefined
  if (typeof baseUrlConfig === 'string') {
    return { url: baseUrlConfig, styleTag: true, inlineCss: true }
  }
  if (typeof baseUrlConfig === 'object' && 'url' in baseUrlConfig) {
    return {
      url: baseUrlConfig.url ?? '',
      tags: baseUrlConfig.tags,
      attributes: baseUrlConfig.attributes,
      styleTag: baseUrlConfig.styleTag ?? true,
      inlineCss: baseUrlConfig.inlineCss ?? true,
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

export function base(dom: ChildNode[], config: UrlConfig = {}): ChildNode[] {
  const baseUrlConfig = getBaseUrl(config)
  const options = resolveOptions(baseUrlConfig)

  if (!options || !options.url) {
    return dom
  }

  const { url: baseUrl, styleTag = true, inlineCss = true, attributes = {} } = options

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

    if (!el.attribs) return

    // Process tag-specific attributes (respects tags filter)
    const tagConfig = getTagConfig(el.name, options)

    if (tagConfig || options.tags === undefined) {
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

  // VML and MSO comment rewrites require operating on serialized HTML
  // (HTML comments are not represented as traversable DOM nodes)
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

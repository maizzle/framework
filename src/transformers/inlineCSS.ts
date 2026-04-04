import juice from 'juice'
import { walk, parse, serialize } from '../utils/ast/index.ts'
import type { ChildNode, Element } from 'domhandler'
import type { Options as JuiceOptions } from 'juice'
import type { CssConfig } from '../types/config.ts'

interface InlineCssOptions {
  removeStyleTags?: boolean
  removeInlinedSelectors?: boolean
  preferUnitlessValues?: boolean
  safelist?: string[]
  styleToAttribute?: Record<string, string>
  applyWidthAttributes?: boolean
  applyHeightAttributes?: boolean
  widthElements?: string[]
  heightElements?: string[]
  excludedProperties?: string[]
  codeBlocks?: Record<string, { start: string; end: string }>
  customCSS?: string
}

/**
 * Inline CSS transformer.
 *
 * Inlines CSS from `<style>` tags into inline style attributes on HTML elements.
 * This is important for email client compatibility (especially Outlook on Windows).
 *
 * Enabled when `css.inline` is set to `true` or an object with options.
 *
 * Options:
 * - removeStyleTags: Remove style tags after inlining (default: false)
 * - removeInlinedSelectors: Remove classes after they've been inlined (default: true)
 * - preferUnitlessValues: Convert 0px, 0em, etc. to 0 (default: true)
 * - safelist: Selectors that should not be removed after inlining
 * - styleToAttribute: Map CSS properties to HTML attributes (e.g., background-color -> bgcolor)
 * - applyWidthAttributes: Add width attributes based on inline CSS (default: true)
 * - applyHeightAttributes: Add height attributes based on inline CSS (default: true)
 * - widthElements: Elements that can receive width attributes (default: ['img', 'video'])
 * - heightElements: Elements that can receive height attributes (default: ['img', 'video'])
 * - excludedProperties: CSS properties to exclude from inlining
 * - codeBlocks: Fenced code blocks to ignore (default: { EJS: { start: '<%', end: '%>' }, HBS: { start: '{{', end: '}}' } })
 * - customCSS: Additional CSS to inline
 */
export function inlineCSS(dom: ChildNode[], config: CssConfig = {}): ChildNode[] {
  const inline = config.inline

  // Disabled when inline is falsy or not an object/truthy
  if (!inline) {
    return dom
  }

  // Build options from config
  const options: InlineCssOptions = typeof inline === 'object' ? inline : {}

  const removeStyleTags = options.removeStyleTags ?? false
  const customCSS = options.customCSS ?? ''

  // Configure Juice static properties
  juice.styleToAttribute = options.styleToAttribute ?? {}
  juice.excludedProperties = ['--tw-shadow', ...(options.excludedProperties ?? [])]
  juice.widthElements = (options.widthElements ?? ['img', 'video']).map(i => i.toUpperCase()) as unknown as HTMLElement[]
  juice.heightElements = (options.heightElements ?? ['img', 'video']).map(i => i.toUpperCase()) as unknown as HTMLElement[]

  // Add custom code blocks
  if (options.codeBlocks && typeof options.codeBlocks === 'object') {
    Object.entries(options.codeBlocks).forEach(([key, value]) => {
      if (value.start && value.end) {
        juice.codeBlocks[key] = value
      }
    })
  }

  // Handle style tags with embed attributes
  walk(dom, (node) => {
    const el = node as Element
    if (el.name === 'style' && el.attribs) {
      // Add data-embed to style tags with embed attribute
      if (el.attribs.embed && !('data-embed' in el.attribs)) {
        el.attribs['data-embed'] = ''
      }
      // Add embed to style tags with data-embed attribute
      if (el.attribs['data-embed'] && !('embed' in el.attribs)) {
        el.attribs.embed = ''
      }
    }
  })

  // Serialize for juice (juice requires a string)
  const serialized = serialize(dom)

  let inlinedHtml: string

  try {
    const juiceOptions: JuiceOptions = {
      removeStyleTags,
      removeInlinedSelectors: options.removeInlinedSelectors ?? true,
      preservedSelectors: options.safelist ?? [],
      applyWidthAttributes: options.applyWidthAttributes ?? true,
      applyHeightAttributes: options.applyHeightAttributes ?? true,
    }

    if (customCSS) {
      inlinedHtml = juice(serialized, { ...juiceOptions, extraCss: customCSS })
    } else {
      inlinedHtml = juice(serialized, juiceOptions)
    }
  } catch {
    // If Juice fails, return the dom unchanged
    return dom
  }

  // Post-process for preferUnitlessValues
  const preferUnitlessValues = options.preferUnitlessValues ?? true
  const result = parse(inlinedHtml)

  if (preferUnitlessValues) {
    walk(result, (node) => {
      const el = node as Element
      if (el.attribs?.style) {
        el.attribs.style = el.attribs.style.replace(
          /\b0(px|rem|em|%|vh|vw|vmin|vmax|in|cm|mm|pt|pc|ex|ch)\b/g,
          '0'
        )
      }
    })
  }

  return result
}

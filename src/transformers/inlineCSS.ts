import juice from 'juice'
import { walk, parse, serialize } from '../utils/ast/index.ts'
import type { ChildNode, Element } from 'domhandler'
import type { Options as JuiceOptions } from 'juice'
import type { CssConfig } from '../types/config.ts'

/**
 * Inline CSS transformer.
 *
 * Inlines CSS from `<style>` tags into inline style attributes on HTML elements.
 * This is important for email client compatibility (especially Outlook on Windows).
 *
 * Enabled when `css.inline` is set to `true` or an object with options.
 * All Juice options are supported and passed through directly.
 */
export function inlineCSS(dom: ChildNode[], config: CssConfig = {}): ChildNode[] {
  const inline = config.inline

  // Disabled when inline is falsy or not an object/truthy
  if (!inline) {
    return dom
  }

  // Build options from config
  const options = typeof inline === 'object' ? inline : {}

  // Separate Maizzle-specific options from Juice options
  const {
    preferUnitlessValues = true,
    safelist,
    customCSS = '',
    styleToAttribute,
    excludedProperties,
    widthElements,
    heightElements,
    codeBlocks,
    ...juicePassthrough
  } = options

  // Configure Juice static properties
  juice.styleToAttribute = styleToAttribute ?? {}
  juice.excludedProperties = ['--tw-shadow', ...(excludedProperties ?? [])]
  juice.widthElements = (widthElements ?? ['img', 'video']).map(i => i.toUpperCase()) as unknown as HTMLElement[]
  juice.heightElements = (heightElements ?? ['img', 'video']).map(i => i.toUpperCase()) as unknown as HTMLElement[]

  // Add custom code blocks
  if (codeBlocks && typeof codeBlocks === 'object') {
    Object.entries(codeBlocks).forEach(([key, value]) => {
      if (value.start && value.end) {
        juice.codeBlocks[key] = value
      }
    })
  }

  // Handle style tags with embed attributes.
  // We add a marker attribute that persists through the pipeline,
  // then restore data-embed from it after Juice runs.
  walk(dom, (node) => {
    const el = node as Element
    if (el.name === 'style' && el.attribs) {
      // Sync data-embed ↔ embed
      if (el.attribs.embed && !('data-embed' in el.attribs)) {
        el.attribs['data-embed'] = ''
      }
      if (el.attribs['data-embed'] && !('embed' in el.attribs)) {
        el.attribs.embed = ''
      }

      // Add marker that persists through the pipeline
      if ('data-embed' in el.attribs) {
        el.attribs['data-maizzle-embed'] = ''
      }
    }
  })

  // Serialize for juice (juice requires a string)
  const serialized = serialize(dom)

  let inlinedHtml: string

  try {
    const juiceOptions: JuiceOptions = {
      removeStyleTags: juicePassthrough.removeStyleTags ?? false,
      removeInlinedSelectors: juicePassthrough.removeInlinedSelectors ?? true,
      applyWidthAttributes: juicePassthrough.applyWidthAttributes ?? true,
      applyHeightAttributes: juicePassthrough.applyHeightAttributes ?? true,
      preservedSelectors: safelist ?? [],
      ...customCSS ? { extraCss: customCSS } : {},
      inlineDuplicateProperties: juicePassthrough.inlineDuplicateProperties ?? true,
      ...juicePassthrough,
    }

    inlinedHtml = juice(serialized, juiceOptions)
  } catch {
    // If Juice fails, return the dom unchanged
    return dom
  }

  // Post-process for preferUnitlessValues
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

  // Restore data-embed from our marker, then remove the marker.
  // The purge step will handle final data-embed/embed removal.
  walk(result, (node) => {
    const el = node as Element
    if (el.name === 'style' && el.attribs && 'data-maizzle-embed' in el.attribs) {
      el.attribs['data-embed'] = ''
      el.attribs.embed = ''
      delete el.attribs['data-maizzle-embed']
    }
  })

  return result
}

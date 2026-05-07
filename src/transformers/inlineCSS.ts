import juice from 'juice'
import { walk, parse, serialize } from '../utils/ast/index.ts'
import type { ChildNode, Element } from 'domhandler'
import type { Options as JuiceOptions } from 'juice'

/**
 * Options for the `inlineCSS` transformer. Accepts every Juice option plus a
 * handful of Maizzle-specific extras.
 */
export interface InlineCSSOptions extends JuiceOptions {
  /**
   * Convert `0px`, `0em` etc. to `0` in inline styles.
   *
   * @default true
   */
  preferUnitlessValues?: boolean
  /**
   * CSS selectors to preserve in `<style>` tags, even after inlining.
   * Mapped to Juice's `preservedSelectors` option.
   *
   * @default []
   */
  safelist?: string[]
  /**
   * Additional CSS string to inline alongside `<style>` tag contents.
   * Mapped to Juice's `extraCss` option.
   */
  customCSS?: string
  /**
   * Duplicate CSS properties to HTML attributes.
   * Mapped to Juice's static `styleToAttribute` property.
   */
  styleToAttribute?: Record<string, string>
  /**
   * CSS properties to exclude from inlining.
   * Mapped to Juice's static `excludedProperties` property.
   */
  excludedProperties?: string[]
  /**
   * Elements that can receive `width` HTML attributes.
   * Mapped to Juice's static `widthElements` property.
   *
   * @default ['img', 'video']
   */
  widthElements?: string[]
  /**
   * Elements that can receive `height` HTML attributes.
   * Mapped to Juice's static `heightElements` property.
   *
   * @default ['img', 'video']
   */
  heightElements?: string[]
  /**
   * Template language code blocks to preserve during inlining.
   * Mapped to Juice's static `codeBlocks` property.
   */
  codeBlocks?: Record<string, { start: string; end: string }>
}

/**
 * Inline CSS from `<style>` tags into `style` attributes on matching elements.
 *
 * @param html    HTML string to transform.
 * @param options Juice options plus Maizzle-specific extras.
 * @returns       The transformed HTML string.
 *
 * @example
 * import { inlineCSS } from '@maizzle/framework'
 *
 * const out = inlineCSS('<style>.red{color:red}</style><p class="red">x</p>', {
 *   removeStyleTags: true,
 * })
 */
export function inlineCSS(html: string, options: InlineCSSOptions = {}): string {
  return serialize(inlineCSSDom(parse(html), options))
}

/**
 * DOM-form of {@link inlineCSS} used by the internal transformer pipeline.
 * Takes a parsed DOM, returns a parsed DOM — avoids the redundant
 * serialize/parse round-trips when chained with other transformers.
 */
export function inlineCSSDom(dom: ChildNode[], options: InlineCSSOptions = {}): ChildNode[] {
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
      // Sync data-embed ↔ embed. Use `in` so presence-only attrs
      // (<style embed> → attribs.embed === '') still count.
      if ('embed' in el.attribs && !('data-embed' in el.attribs)) {
        el.attribs['data-embed'] = ''
      }
      if ('data-embed' in el.attribs && !('embed' in el.attribs)) {
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

  walk(result, (node) => {
    const el = node as Element
    if (el.attribs?.style) {
      // Normalize style formatting: ensure spaces after : and ;
      let style = el.attribs.style
        .replace(/:\s*/g, ': ')
        .replace(/;\s*/g, '; ')
        .trimEnd()

      // Ensure trailing semicolon
      if (!style.endsWith(';')) {
        style += ';'
      }

      if (preferUnitlessValues) {
        style = style.replace(
          /\b0(px|rem|em|%|vh|vw|vmin|vmax|in|cm|mm|pt|pc|ex|ch)\b/g,
          '0'
        )
      }

      el.attribs.style = style
    }
  })

  /**
   * Restore `embed` from our marker so the purge step can detect
   * these tags and skip them. Drop `data-embed` (juice's name)
   * since it's redundant once `embed` is back, and let purge
   * strip `embed` itself at the end of its run.
   */
  walk(result, (node) => {
    const el = node as Element
    if (el.name === 'style' && el.attribs && 'data-maizzle-embed' in el.attribs) {
      el.attribs.embed = ''
      delete el.attribs['data-embed']
      delete el.attribs['data-maizzle-embed']
    }
  })

  return result
}

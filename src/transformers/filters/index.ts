import { Text } from 'domhandler'
import type { ChildNode, Element } from 'domhandler'
import { parse, serialize } from '../../utils/ast/index.ts'
import { protectMarkers } from '../../utils/output-markers.ts'
import { isRawText } from '../../utils/ast/serializer.ts'
import { defaults } from './defaults.ts'

export type { FilterFunction } from './defaults.ts'
export type FiltersConfig = false | Record<string, (str: string, value: string) => string>

/**
 * Filters that take and return HTML source. All other default filters take
 * and return text, so they see `&` rather than `&amp;`. Custom filters are
 * treated as HTML filters, so they may return markup.
 */
const HTML_FILTERS = ['escape', 'escape-once', 'newline-to-br']

function textOf(nodes: ChildNode[]): string {
  return nodes.map(node => (node as Text).data).join('')
}

/**
 * Process children before parents so nested filter elements work correctly.
 */
function walkBottomUp(nodes: ChildNode[], callback: (node: ChildNode) => void): void {
  for (const node of nodes.slice()) {
    if ('children' in node && node.children?.length) {
      walkBottomUp(node.children as ChildNode[], callback)
    }

    callback(node)
  }
}

/**
 * Apply transformation functions to the content of elements that have
 * matching filter attributes. Multiple filters on the same element are
 * executed in the order the attributes are defined.
 *
 * Default filters include string manipulation (`uppercase`, `lowercase`,
 * `trim`, etc.), math operations (`plus`, `minus`, `multiply`, etc.),
 * and more.
 *
 * @param html    HTML string to transform.
 * @param custom  Custom filters to merge with the defaults. Pass `false`
 *                to disable all filters (including the defaults).
 * @returns       The transformed HTML string.
 *
 * @example
 * import { filters } from '@maizzle/framework'
 *
 * // Defaults only
 * const out = filters('<p uppercase>foo</p>') // → '<p>FOO</p>'
 *
 * // Add a custom filter
 * filters('<p suffix=" world">hello</p>', {
 *   suffix: (s, v) => s + v,
 * })
 *
 * // Disable all filters
 * filters('<p uppercase>foo</p>', false)
 */
export function filters(html: string, custom: FiltersConfig = {}): string {
  return serialize(filtersDom(parse(html), custom))
}

/**
 * DOM-form of {@link filters} used by the internal transformer pipeline.
 * Takes a parsed DOM, returns a parsed DOM — avoids redundant
 * serialize/parse round-trips when chained with other transformers.
 */
export function filtersDom(dom: ChildNode[], custom: FiltersConfig = {}): ChildNode[] {
  if (custom === false) return dom

  const allFilters = { ...defaults, ...custom }
  const filterNames = new Set(Object.keys(allFilters))
  const htmlFilters = new Set([...HTML_FILTERS, ...Object.keys(custom)])

  walkBottomUp(dom, (node) => {
    const el = node as Element

    if (!el.attribs) return

    // Collect matching filter attributes in source order
    const matched: Array<{ name: string; value: string }> = []

    for (const attr of Object.keys(el.attribs)) {
      if (filterNames.has(attr)) {
        matched.push({ name: attr, value: el.attribs[attr] })
      }
    }

    if (matched.length === 0) return

    // CSS and JS are raw text, not HTML: every filter works on the text as-is.
    const raw = isRawText(el)
    let isText = raw || el.children.every(child => child.type === 'text')
    let content = isText ? textOf(el.children) : serialize(el.children as ChildNode[])

    // Apply each filter in attribute order, converting the content between
    // text and HTML source as each filter expects. Elements with child
    // elements stay HTML source, so text filters see their markup too.
    for (const { name, value } of matched) {
      const textFilter = !htmlFilters.has(name)
      if (!raw && textFilter && !isText) {
        const nodes = parse(content)
        if (nodes.every(child => child.type === 'text')) {
          content = textOf(nodes)
          isText = true
        }
      } else if (!raw && !textFilter && isText) {
        content = serialize([new Text(content)])
        isText = false
      }

      // Leave output and <Raw> markers intact
      content = protectMarkers(content, str => allFilters[name](str, value))
      delete el.attribs[name]
    }

    // Replace children with the filtered content
    el.children = isText ? [new Text(content)] : parse(content)
    for (const child of el.children) child.parent = el
  })

  return dom
}

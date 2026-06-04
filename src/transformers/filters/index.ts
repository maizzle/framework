import { Text } from 'domhandler'
import type { ChildNode, Element } from 'domhandler'
import { parse, serialize } from '../../utils/ast/index.ts'
import { defaults } from './defaults.ts'

export type { FilterFunction } from './defaults.ts'
export type FiltersConfig = false | Record<string, (str: string, value: string) => string>

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

    // Serialize children to get innerHTML
    let content = serialize(el.children as ChildNode[])

    // Apply each filter in attribute order
    for (const { name, value } of matched) {
      content = allFilters[name](content, value)
      delete el.attribs[name]
    }

    // Replace children with the filtered content
    if (content === '') {
      el.children = []
    } else if (/<[a-z/!]/i.test(content)) {
      // Result contains HTML elements — parse back to DOM
      const newChildren = parse(content)

      for (const child of newChildren) {
        child.parent = el as any
      }

      el.children = newChildren as ChildNode[]
    } else {
      // Text-only result — create a text node directly to preserve entity strings
      const textNode = new Text(content)
      textNode.parent = el as any
      el.children = [textNode]
    }
  })

  return dom
}
